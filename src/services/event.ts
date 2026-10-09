import { QueryFilter, Types } from "mongoose";
import EventDAO from "@/db/actions/event";
import MessageThreadDAO from "@/db/actions/messageThread";
import OrgSettingsDAO from "@/db/actions/orgSettings";
import ShiftDAO from "@/db/actions/shift";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import {
  ADULT_AGE,
  MAX_SHIFT_HOURS,
  MAX_SHIFTS_PER_EVENT,
  PAGE_SIZE,
} from "@/constants/limits";
import {
  fromDateTimeLocal,
  generateWeeklySessionDates,
  hoursBetween,
  startOfDay,
  toDateInput,
} from "@/lib/dates";
import { appUrl } from "@/lib/urls";
import { escapeRegex } from "@/lib/utils";
import AuditService from "@/services/audit";
import EventUpdateService from "@/services/eventUpdate";
import NotificationService from "@/services/notification";
import SignupService from "@/services/signup";
import type { EventDetail, EventWithShifts, Paginated } from "@/types/api";
import type { Actor } from "@/types/auth";
import {
  WEEKDAYS,
  type Event,
  type ProgramArea,
  type Shift,
  type Weekday,
} from "@/types/event";
import type { Region, SafeUser } from "@/types/user";
import {
  ConflictError,
  IllegalOperationError,
  InvalidArgumentsError,
  NotFoundError,
} from "@/types/exceptions";
import type { Doc } from "@/types/models";
import { LIVE_SIGNUP_STATUSES } from "@/types/signup";
import {
  assertCanManageEvent,
  canManageEvent,
  isAdmin,
  sameId,
} from "@/utils/authorization";
import ERRORS from "@/utils/errorMessages";
import {
  adminEventFiltersSchema,
  cancelEventSchema,
  createEventSchema,
  eventFiltersSchema,
  eventInputSchema,
  reassignEventSchema,
  seriesUpdateInputSchema,
  shiftInputSchema,
} from "@/utils/validation/event";

type EventFiltersInput = Record<string, string | undefined>;

/** Events and their shifts. Shifts are the unit volunteers sign up for. */
export default class EventService {
  private static async attachShifts(
    events: Doc<Event>[]
  ): Promise<EventWithShifts[]> {
    if (!events.length) return [];
    const [shifts, organizers] = await Promise.all([
      ShiftDAO.findByEvents(events.map((e) => e._id)),
      UserDAO.findSummaries([
        ...new Set(events.map((e) => e.organizerId.toString())),
      ]),
    ]);
    return events.map((event) => {
      const organizer = organizers.find((o) =>
        sameId(o._id, event.organizerId)
      );
      return {
        ...event,
        shifts: shifts.filter((s) => sameId(s.eventId, event._id)),
        organizerName: organizer
          ? `${organizer.firstName} ${organizer.lastName}`
          : "Pink STEM",
      };
    });
  }

  private static baseFilter(filters: {
    from?: Date;
    to?: Date;
    programArea?: ProgramArea;
    where?: Region | "virtual";
    q?: string;
  }): QueryFilter<Event> {
    const filter: QueryFilter<Event> = {};
    filter.eventDate = { $gte: filters.from ?? startOfDay(new Date()) };
    if (filters.to) filter.eventDate.$lte = filters.to;
    if (filters.programArea) filter.programArea = filters.programArea;
    if (filters.where === "virtual") filter.isVirtual = true;
    else if (filters.where) filter.region = filters.where;
    if (filters.q) {
      const re = new RegExp(escapeRegex(filters.q), "i");
      filter.$or = [
        { title: re },
        { description: re },
        { locationName: re },
        { city: re },
      ];
    }
    return filter;
  }

  /** Public browse: published, public events from today onward. */
  static async list(
    input: EventFiltersInput
  ): Promise<Paginated<EventWithShifts>> {
    const filters = eventFiltersSchema.parse(input);
    const filter: QueryFilter<Event> = {
      ...EventService.baseFilter(filters),
      status: "published",
      visibility: "public",
    };
    // Spot availability lives on shifts, so filter after the join. Upcoming
    // events number in the dozens, not thousands, which keeps this cheap.
    const { items } = await EventDAO.list(filter, { limit: 500 });
    let withShifts = await EventService.attachShifts(items);
    if (filters.hasSpots) {
      withShifts = withShifts.filter((e) =>
        e.shifts.some((s) => s.filledCount < s.capacity)
      );
    }
    const start = (filters.page - 1) * PAGE_SIZE;
    return {
      items: withShifts.slice(start, start + PAGE_SIZE),
      total: withShifts.length,
      page: filters.page,
      pageSize: PAGE_SIZE,
    };
  }

  static async get(eventId: string, actor: Actor | null): Promise<EventDetail> {
    const event = await EventDAO.findById(eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    const manage = !!actor && canManageEvent(actor, event);
    if (event.status === "draft" && !manage)
      throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);

    const [withShifts] = await EventService.attachShifts([event]);
    const mySignups = actor
      ? (await SignupDAO.findByEvent(event._id)).filter(
          (s) => sameId(s.volunteerId, actor.id) && s.status !== "cancelled"
        )
      : [];
    const onRoster = mySignups.some((s) =>
      (LIVE_SIGNUP_STATUSES as readonly string[]).includes(s.status)
    );
    const updates = await EventUpdateService.list(event, manage || onRoster);
    return { ...withShifts, mySignups, updates, canManage: manage };
  }

  static async listForOrganizer(actor: Actor): Promise<EventWithShifts[]> {
    const events = await EventDAO.findAll({
      organizerId: new Types.ObjectId(actor.id),
    });
    return EventService.attachShifts(events);
  }

  static async listAll(
    input: EventFiltersInput
  ): Promise<Paginated<EventWithShifts>> {
    const filters = adminEventFiltersSchema.parse(input);
    const filter = EventService.baseFilter(filters);
    if (filters.status) filter.status = filters.status;
    if (filters.organizerId)
      filter.organizerId = new Types.ObjectId(filters.organizerId);
    if (!filters.from) delete filter.eventDate;
    const { items, total } = await EventDAO.list(filter, {
      sort: { eventDate: -1 },
      skip: (filters.page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    });
    return {
      items: await EventService.attachShifts(items),
      total,
      page: filters.page,
      pageSize: PAGE_SIZE,
    };
  }

  private static validateInput(
    data: Pick<
      ReturnType<typeof eventInputSchema.parse>,
      "isVirtual" | "virtualLink" | "locationName" | "address"
    >
  ) {
    if (data.isVirtual && !data.virtualLink)
      throw new InvalidArgumentsError(ERRORS.EVENT.VIRTUAL_LINK);
    if (!data.isVirtual && !data.locationName && !data.address) {
      throw new InvalidArgumentsError(ERRORS.EVENT.LOCATION_REQUIRED);
    }
  }

  /** Events can only be owned by an active organizer or admin. */
  private static async assignableOrganizer(
    organizerId?: string
  ): Promise<Doc<SafeUser>> {
    const organizer = organizerId ? await UserDAO.findById(organizerId) : null;
    if (
      !organizer ||
      organizer.role === "volunteer" ||
      organizer.status !== "active"
    ) {
      throw new InvalidArgumentsError(ERRORS.EVENT.ORGANIZER_ROLE);
    }
    return organizer;
  }

  /** Tells an organizer that an admin has handed them an event. */
  private static async notifyAssigned(
    organizer: Doc<SafeUser>,
    event: Doc<Event>,
    body: string
  ) {
    const org = await NotificationService.org();
    await NotificationService.send(
      organizer,
      NotificationService.templates.organizerNotice(org, {
        name: organizer.firstName,
        subject: `You now organize ${event.title}`,
        title: "An event was assigned to you",
        body,
        url: appUrl(`/organizer/events/${event._id}`),
      })
    );
  }

  /** Admins pick the organizer; organizers own what they create. */
  static async create(actor: Actor, input: unknown): Promise<EventWithShifts> {
    const parsed = createEventSchema.parse(input);
    if (parsed.commitment === "long_term") {
      return EventService.createLongTerm(actor, parsed);
    }

    const { organizerId, ...data } = parsed;
    EventService.validateInput(data);
    const organizer = isAdmin(actor)
      ? await EventService.assignableOrganizer(organizerId)
      : null;
    const event = await EventDAO.create({
      ...data,
      minAge: data.minAge ?? undefined,
      organizerId: organizer?._id ?? new Types.ObjectId(actor.id),
    });
    if (organizer && !sameId(organizer._id, actor.id)) {
      await EventService.notifyAssigned(
        organizer,
        event,
        `${actor.name} created ${event.title} and made you its organizer. It stays a draft until it is published.`
      );
    }
    const [withShifts] = await EventService.attachShifts([event]);
    return withShifts;
  }

  private static async createLongTerm(
    actor: Actor,
    input: Extract<
      ReturnType<typeof createEventSchema.parse>,
      {
        commitment: "long_term";
      }
    >
  ): Promise<EventWithShifts> {
    const { organizerId, schedule, shift, ...eventData } = input;
    EventService.validateInput(eventData);
    const organizer = isAdmin(actor)
      ? await EventService.assignableOrganizer(organizerId)
      : null;
    const sessions = generateWeeklySessionDates(
      schedule.firstDate,
      schedule.lastDate,
      schedule.weekdays,
      schedule.startTime,
      schedule.endTime
    );
    EventService.validateShift({ ...shift, ...sessions[0] });

    const seriesId = new Types.ObjectId();
    const events = await EventDAO.createMany(
      sessions.map((session) => ({
        ...eventData,
        seriesId,
        seriesWeekdays: schedule.weekdays,
        seriesStartDate: schedule.firstDate,
        seriesEndDate: schedule.lastDate,
        eventDate: session.eventDate,
        requiresClearance: true,
        minAge: ADULT_AGE,
        organizerId: organizer?._id ?? new Types.ObjectId(actor.id),
      }))
    );
    await ShiftDAO.createMany(
      events.map((event, index) => ({
        ...shift,
        eventId: event._id,
        startsAt: sessions[index].startsAt,
        endsAt: sessions[index].endsAt,
      }))
    );

    if (organizer && !sameId(organizer._id, actor.id)) {
      await EventService.notifyAssigned(
        organizer,
        events[0],
        `${actor.name} created the ${events[0].title} long-term program and made you its organizer. Its sessions stay as drafts until they are published.`
      );
    }
    const [firstSession] = await EventService.attachShifts([events[0]]);
    return firstSession;
  }

  private static async editable(
    actor: Actor,
    eventId: string
  ): Promise<Doc<Event>> {
    const event = await EventDAO.findById(eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, event);
    if (event.status === "completed" || event.status === "cancelled") {
      throw new IllegalOperationError(ERRORS.EVENT.NOT_EDITABLE);
    }
    return event;
  }

  static async update(
    actor: Actor,
    eventId: string,
    input: unknown
  ): Promise<EventWithShifts> {
    const event = await EventService.editable(actor, eventId);
    const parsed = eventInputSchema.parse(input);
    const data = {
      ...parsed,
      commitment: event.commitment,
      ...(event.commitment === "long_term"
        ? { requiresClearance: true, minAge: ADULT_AGE }
        : {}),
    };
    EventService.validateInput(data);
    const updated = (await EventDAO.updateById(eventId, {
      ...data,
      minAge: data.minAge ?? null,
    })) as Doc<Event>;
    const [withShifts] = await EventService.attachShifts([updated]);
    return withShifts;
  }

  private static async series(
    actor: Actor,
    eventId: string
  ): Promise<{ anchor: Doc<Event>; events: Doc<Event>[] }> {
    const anchor = await EventDAO.findById(eventId);
    if (!anchor) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, anchor);
    if (anchor.commitment !== "long_term" || !anchor.seriesId) {
      throw new IllegalOperationError(ERRORS.EVENT.SERIES_REQUIRED);
    }
    return {
      anchor,
      events: await EventDAO.findAll({ seriesId: anchor.seriesId }),
    };
  }

  private static seriesWeekdays(events: Doc<Event>[]): Weekday[] {
    const stored = events.find(
      (event) => event.seriesWeekdays?.length
    )?.seriesWeekdays;
    if (stored?.length) return stored;

    // Compatibility for series created before recurrence metadata existed.
    return [
      ...new Set(
        events.map((event) => {
          const date = toDateInput(event.eventDate);
          const day = new Date(`${date}T00:00:00Z`).getUTCDay();
          return WEEKDAYS[day];
        })
      ),
    ];
  }

  private static isUpcoming(
    event: Doc<Event>,
    shift: Doc<Shift> | undefined,
    now: Date
  ): boolean {
    return shift ? shift.startsAt > now : event.eventDate >= startOfDay(now);
  }

  static async updateSeries(
    actor: Actor,
    eventId: string,
    input: unknown
  ): Promise<EventWithShifts> {
    const data = seriesUpdateInputSchema.parse(input);
    EventService.validateInput(data);
    const { anchor, events } = await EventService.series(actor, eventId);
    const shifts = await ShiftDAO.findByEvents(
      events.map((event) => event._id)
    );
    const shiftByEvent = new Map(
      shifts.map((shift) => [shift.eventId.toString(), shift])
    );
    const now = new Date();
    const newEnd = toDateInput(data.schedule.lastDate);
    const active = events.filter(
      (event) => event.status !== "cancelled" && event.status !== "completed"
    );
    const upcoming = active.filter((event) =>
      EventService.isUpcoming(
        event,
        shiftByEvent.get(event._id.toString()),
        now
      )
    );
    const toCancel = upcoming.filter(
      (event) => toDateInput(event.eventDate) > newEnd
    );
    const toUpdate = upcoming.filter(
      (event) => toDateInput(event.eventDate) <= newEnd
    );
    const { schedule, shift, ...eventData } = data;

    for (const event of toUpdate) {
      const existingShift = shiftByEvent.get(event._id.toString());
      if (!existingShift) {
        throw new IllegalOperationError(ERRORS.EVENT.NO_SHIFTS);
      }
      const date = toDateInput(event.eventDate);
      EventService.validateShift(
        {
          ...shift,
          startsAt: fromDateTimeLocal(`${date}T${schedule.startTime}`),
          endsAt: fromDateTimeLocal(`${date}T${schedule.endTime}`),
        },
        existingShift.filledCount
      );
    }

    const weekdays = EventService.seriesWeekdays(events);
    const recordedEnd = events
      .map((event) => event.seriesEndDate)
      .filter((date): date is Date => !!date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const currentEnd = toDateInput(
      recordedEnd ?? events[events.length - 1].eventDate
    );
    const existingDates = new Set(
      active.map((event) => toDateInput(event.eventDate))
    );
    const additions =
      newEnd > currentEnd
        ? generateWeeklySessionDates(
            currentEnd,
            data.schedule.lastDate,
            weekdays,
            schedule.startTime,
            schedule.endTime
          ).filter((session) => {
            const date = toDateInput(session.eventDate);
            return (
              session.startsAt > now &&
              date > currentEnd &&
              !existingDates.has(date)
            );
          })
        : [];

    for (const session of additions) {
      EventService.validateShift({ ...shift, ...session });
    }

    await Promise.all(
      toUpdate.flatMap((event) => {
        const existingShift = shiftByEvent.get(
          event._id.toString()
        ) as Doc<Shift>;
        const date = toDateInput(event.eventDate);
        return [
          EventDAO.updateById(event._id, {
            ...eventData,
            commitment: "long_term",
            requiresClearance: true,
            minAge: ADULT_AGE,
          }),
          ShiftDAO.updateById(existingShift._id, {
            ...shift,
            startsAt: fromDateTimeLocal(`${date}T${schedule.startTime}`),
            endsAt: fromDateTimeLocal(`${date}T${schedule.endTime}`),
          }),
        ];
      })
    );

    for (const event of toCancel) {
      await EventService.cancel(actor, event._id.toString(), {
        reason: "This session was removed when the program end date changed.",
      });
    }

    if (additions.length) {
      const addedEvents = await EventDAO.createMany(
        additions.map((session) => ({
          ...eventData,
          commitment: "long_term" as const,
          seriesId: anchor.seriesId,
          seriesWeekdays: weekdays,
          seriesStartDate: anchor.seriesStartDate ?? events[0].eventDate,
          seriesEndDate: data.schedule.lastDate,
          eventDate: session.eventDate,
          requiresClearance: true,
          minAge: ADULT_AGE,
          organizerId: anchor.organizerId,
        }))
      );
      await ShiftDAO.createMany(
        addedEvents.map((event, index) => ({
          ...shift,
          eventId: event._id,
          startsAt: additions[index].startsAt,
          endsAt: additions[index].endsAt,
        }))
      );
    }

    await EventDAO.updateMany(
      { seriesId: anchor.seriesId },
      {
        seriesWeekdays: weekdays,
        seriesStartDate: anchor.seriesStartDate ?? events[0].eventDate,
        seriesEndDate: data.schedule.lastDate,
      }
    );
    const updatedAnchor = (await EventDAO.findById(anchor._id)) as Doc<Event>;
    const [withShifts] = await EventService.attachShifts([updatedAnchor]);
    return withShifts;
  }

  static async cancelSeries(
    actor: Actor,
    eventId: string,
    input: unknown
  ): Promise<{ cancelled: number }> {
    const data = cancelEventSchema.parse(input);
    const { events } = await EventService.series(actor, eventId);
    const shifts = await ShiftDAO.findByEvents(
      events.map((event) => event._id)
    );
    const shiftByEvent = new Map(
      shifts.map((shift) => [shift.eventId.toString(), shift])
    );
    const now = new Date();
    const remaining = events.filter(
      (event) =>
        event.status !== "cancelled" &&
        event.status !== "completed" &&
        EventService.isUpcoming(
          event,
          shiftByEvent.get(event._id.toString()),
          now
        )
    );
    for (const event of remaining) {
      await EventService.cancel(actor, event._id.toString(), data);
    }
    return { cancelled: remaining.length };
  }

  static async publish(
    actor: Actor,
    eventId: string
  ): Promise<EventWithShifts> {
    const event = await EventService.editable(actor, eventId);
    if (event.status === "published")
      throw new ConflictError(ERRORS.EVENT.ALREADY_PUBLISHED);
    const shifts = await ShiftDAO.findByEvent(event._id);
    if (!shifts.length) throw new IllegalOperationError(ERRORS.EVENT.NO_SHIFTS);
    const updated = (await EventDAO.updateById(eventId, {
      status: "published",
      publishedAt: new Date(),
    })) as Doc<Event>;
    const [withShifts] = await EventService.attachShifts([updated]);
    return withShifts;
  }

  /** Cancelling releases everyone, posts a pinned update, and emails the reason. */
  static async cancel(
    actor: Actor,
    eventId: string,
    input: unknown
  ): Promise<EventWithShifts> {
    const { reason } = cancelEventSchema.parse(input);
    const event = await EventService.editable(actor, eventId);
    const wasPublished = event.status === "published";

    const cancelled = (await EventDAO.updateById(eventId, {
      status: "cancelled",
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy: new Types.ObjectId(actor.id),
    })) as Doc<Event>;

    if (wasPublished) {
      const released = await SignupService.releaseAllForEvent(
        cancelled,
        `Event cancelled: ${reason}`
      );
      await EventUpdateService.postSystemUpdate(
        actor,
        cancelled,
        `This event has been cancelled. ${reason}`
      );
      const details = NotificationService.eventDetails(cancelled);
      await NotificationService.toUsers(
        [...new Set(released.map((s) => s.volunteerId.toString()))],
        (org, user) =>
          NotificationService.templates.eventCancelled(org, {
            name: user.firstName,
            event: details,
            reason,
          })
      );
    }

    await AuditService.record(actor, "event.cancelled", "event", event._id, {
      before: { status: event.status },
      after: { status: "cancelled", reason },
    });
    const [withShifts] = await EventService.attachShifts([cancelled]);
    return withShifts;
  }

  static async duplicate(
    actor: Actor,
    eventId: string
  ): Promise<EventWithShifts> {
    const source = await EventDAO.findById(eventId);
    if (!source) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, source);
    // The copy stays with whoever runs the original, even when an admin makes it.
    const organizer = await EventService.assignableOrganizer(
      source.organizerId.toString()
    );
    const copy = await EventDAO.create({
      title: `Copy of ${source.title}`,
      description: source.description,
      programArea: source.programArea,
      visibility: source.visibility,
      commitment: source.commitment,
      eventDate: source.eventDate,
      region: source.region,
      isVirtual: source.isVirtual,
      virtualLink: source.virtualLink,
      locationName: source.locationName,
      address: source.address,
      locationNote: source.locationNote,
      city: source.city,
      requiresClearance: source.requiresClearance,
      requiresApproval: source.requiresApproval,
      minAge: source.minAge,
      siteContactName: source.siteContactName,
      siteContactPhone: source.siteContactPhone,
      coverImageUrl: source.coverImageUrl,
      organizerId: organizer._id,
    });
    const shifts = await ShiftDAO.findByEvent(source._id);
    await ShiftDAO.createMany(
      shifts.map(
        ({
          roleName,
          description,
          startsAt,
          endsAt,
          capacity,
          minStaffing,
          requiredSkills,
        }) => ({
          eventId: copy._id,
          roleName,
          description,
          startsAt,
          endsAt,
          capacity,
          minStaffing,
          requiredSkills,
        })
      )
    );
    const [withShifts] = await EventService.attachShifts([copy]);
    return withShifts;
  }

  /** Admin only. Threads follow the event; past approvals keep their original attribution. */
  static async reassign(
    admin: Actor,
    eventId: string,
    input: unknown
  ): Promise<EventWithShifts> {
    const { organizerId } = reassignEventSchema.parse(input);
    const event = await EventDAO.findById(eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    const organizer = await EventService.assignableOrganizer(organizerId);
    const updated = (await EventDAO.updateById(eventId, {
      organizerId: organizer._id,
    })) as Doc<Event>;
    await MessageThreadDAO.updateMany(
      { eventId: event._id },
      { organizerId: organizer._id }
    );
    await AuditService.record(admin, "event.reassigned", "event", event._id, {
      before: { organizerId: event.organizerId },
      after: { organizerId: organizer._id },
    });
    await EventService.notifyAssigned(
      organizer,
      event,
      `${admin.name} assigned ${event.title} to you. Its roster, updates, and volunteer conversations are now yours.`
    );
    const [withShifts] = await EventService.attachShifts([updated]);
    return withShifts;
  }

  // ---- Shifts -------------------------------------------------------------

  private static validateShift(
    data: ReturnType<typeof shiftInputSchema.parse>,
    filledCount = 0
  ) {
    if (data.endsAt <= data.startsAt)
      throw new InvalidArgumentsError(ERRORS.SHIFT.TIME_ORDER);
    if (hoursBetween(data.startsAt, data.endsAt) > MAX_SHIFT_HOURS)
      throw new InvalidArgumentsError(ERRORS.SHIFT.TOO_LONG);
    if (data.minStaffing > data.capacity)
      throw new InvalidArgumentsError(ERRORS.SHIFT.MIN_STAFFING);
    if (data.capacity < filledCount)
      throw new InvalidArgumentsError(ERRORS.SHIFT.CAPACITY_BELOW_FILLED);
  }

  static async addShift(
    actor: Actor,
    eventId: string,
    input: unknown
  ): Promise<Doc<Shift>> {
    const event = await EventService.editable(actor, eventId);
    if (event.commitment === "long_term" && event.seriesId) {
      throw new IllegalOperationError(ERRORS.SHIFT.LONG_TERM_MANAGED);
    }
    const data = shiftInputSchema.parse(input);
    EventService.validateShift(data);
    const existing = await ShiftDAO.findByEvent(event._id);
    if (existing.length >= MAX_SHIFTS_PER_EVENT)
      throw new InvalidArgumentsError(ERRORS.SHIFT.TOO_MANY);
    return ShiftDAO.create({ ...data, eventId: event._id });
  }

  static async updateShift(
    actor: Actor,
    shiftId: string,
    input: unknown
  ): Promise<Doc<Shift>> {
    const shift = await ShiftDAO.findById(shiftId);
    if (!shift) throw new NotFoundError(ERRORS.SHIFT.NOT_FOUND);
    const event = await EventService.editable(actor, shift.eventId.toString());
    if (event.commitment === "long_term" && event.seriesId) {
      throw new IllegalOperationError(ERRORS.SHIFT.LONG_TERM_MANAGED);
    }
    const data = shiftInputSchema.parse(input);
    EventService.validateShift(data, shift.filledCount);
    const updated = (await ShiftDAO.updateById(shift._id, data)) as Doc<Shift>;
    if (updated.capacity > shift.capacity && updated.waitlistCount > 0) {
      await SignupService.promoteWaitlist(
        updated._id,
        event,
        await OrgSettingsDAO.get()
      );
    }
    return updated;
  }

  static async deleteShift(actor: Actor, shiftId: string): Promise<void> {
    const shift = await ShiftDAO.findById(shiftId);
    if (!shift) throw new NotFoundError(ERRORS.SHIFT.NOT_FOUND);
    const event = await EventService.editable(actor, shift.eventId.toString());
    if (event.commitment === "long_term" && event.seriesId) {
      throw new IllegalOperationError(ERRORS.SHIFT.LONG_TERM_MANAGED);
    }
    const live = await SignupDAO.count({
      shiftId: shift._id,
      status: { $in: LIVE_SIGNUP_STATUSES },
    });
    if (live > 0) throw new IllegalOperationError(ERRORS.SHIFT.HAS_SIGNUPS);
    await ShiftDAO.deleteById(shift._id);
  }
}
