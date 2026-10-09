"use client";

import { FormEvent, useState } from "react";
import LongTermProgramFields, {
  type LongTermFormValues,
} from "@/components/events/LongTermProgramFields";
import { useOrganizers } from "@/components/hooks/useAdmin";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import {
  EVENT_COMMITMENT_LABELS,
  PROGRAM_AREA_LABELS,
  REGION_LABELS,
} from "@/constants/labels";
import type {
  ClientEvent,
  CreateEventBody,
  EventBody,
  LongTermEventBody,
  SeriesUpdateBody,
} from "@/http/eventHTTPClient";
import { fromDateTimeLocal, toDateInput, toDateTimeLocal } from "@/lib/dates";
import {
  EVENT_COMMITMENTS,
  EVENT_VISIBILITIES,
  PROGRAM_AREAS,
} from "@/types/event";
import { REGIONS } from "@/types/user";

interface CommonEventFormProps {
  /** Admins pick who organizes the event they are creating. */
  chooseOrganizer?: boolean;
  submitLabel: string;
  pending: boolean;
}

type EventFormProps = CommonEventFormProps &
  (
    | {
        initial: ClientEvent;
        editSeries: true;
        onSubmit: (body: SeriesUpdateBody) => Promise<unknown>;
      }
    | {
        initial: ClientEvent;
        editSeries?: false;
        onSubmit: (body: EventBody) => Promise<unknown>;
      }
    | {
        initial?: undefined;
        onSubmit: (body: CreateEventBody) => Promise<unknown>;
      }
  );

function OrganizerSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (organizerId: string) => void;
}) {
  const organizers = useOrganizers();
  return (
    <Select
      label="Organizer"
      required
      placeholder="Choose"
      options={(organizers.data ?? []).map((o) => ({
        value: o._id,
        label: `${o.name} · ${o.role}`,
      }))}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function EventForm(props: EventFormProps) {
  const { initial, chooseOrganizer, submitLabel, pending } = props;
  const editSeries = !!initial && props.editSeries === true;
  const initialShift = initial?.shifts[0];
  const [v, setV] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    programArea: initial?.programArea ?? "",
    visibility: (initial?.visibility ?? "public") as string,
    commitment: initial?.commitment ?? "short_term",
    eventDate: initial ? toDateInput(initial.eventDate) : "",
    region: (initial?.region ?? "metro_atlanta") as string,
    isVirtual: initial?.isVirtual ?? false,
    virtualLink: initial?.virtualLink ?? "",
    locationName: initial?.locationName ?? "",
    address: initial?.address ?? "",
    locationNote: initial?.locationNote ?? "",
    city: initial?.city ?? "",
    requiresClearance: initial?.requiresClearance ?? false,
    requiresApproval: initial?.requiresApproval ?? false,
    minAge: initial?.minAge ? String(initial.minAge) : "",
    siteContactName: initial?.siteContactName ?? "",
    siteContactPhone: initial?.siteContactPhone ?? "",
    coverImageUrl: initial?.coverImageUrl ?? "",
  });
  const [series, setSeries] = useState<LongTermFormValues>({
    weekdays: initial?.seriesWeekdays ?? [],
    startTime: initialShift
      ? toDateTimeLocal(initialShift.startsAt).slice(11)
      : "",
    endTime: initialShift ? toDateTimeLocal(initialShift.endsAt).slice(11) : "",
    firstDate: initial
      ? toDateInput(initial.seriesStartDate ?? initial.eventDate)
      : "",
    lastDate: initial
      ? toDateInput(initial.seriesEndDate ?? initial.eventDate)
      : "",
    roleName: initialShift?.roleName ?? "",
    description: initialShift?.description ?? "",
    capacity: initialShift ? String(initialShift.capacity) : "4",
    minStaffing: initialShift ? String(initialShift.minStaffing) : "2",
    requiredSkills: initialShift?.requiredSkills ?? [],
  });
  const [organizerId, setOrganizerId] = useState("");
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) =>
    setV((s) => ({ ...s, [key]: value }));
  const setSeriesValue = <K extends keyof LongTermFormValues>(
    key: K,
    value: LongTermFormValues[K]
  ) => setSeries((s) => ({ ...s, [key]: value }));

  const sharedBody = () => ({
    title: v.title,
    description: v.description,
    programArea: v.programArea as EventBody["programArea"],
    visibility: v.visibility as EventBody["visibility"],
    region: v.region as EventBody["region"],
    isVirtual: v.isVirtual,
    virtualLink: v.virtualLink,
    locationName: v.locationName,
    address: v.address,
    locationNote: v.locationNote,
    city: v.city,
    requiresApproval: v.requiresApproval,
    siteContactName: v.siteContactName,
    siteContactPhone: v.siteContactPhone,
    coverImageUrl: v.coverImageUrl,
    organizerId: chooseOrganizer ? organizerId : undefined,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (initial && props.editSeries) {
      const body: SeriesUpdateBody = {
        ...sharedBody(),
        schedule: {
          startTime: series.startTime,
          endTime: series.endTime,
          lastDate: series.lastDate,
        },
        shift: {
          roleName: series.roleName,
          description: series.description || undefined,
          capacity: Number(series.capacity),
          minStaffing: Number(series.minStaffing),
          requiredSkills: series.requiredSkills,
        },
      };
      props.onSubmit(body);
      return;
    }

    if (!initial && v.commitment === "long_term") {
      const body: LongTermEventBody = {
        ...sharedBody(),
        commitment: "long_term",
        schedule: {
          weekdays: series.weekdays,
          startTime: series.startTime,
          endTime: series.endTime,
          firstDate: series.firstDate,
          lastDate: series.lastDate,
        },
        shift: {
          roleName: series.roleName,
          description: series.description || undefined,
          capacity: Number(series.capacity),
          minStaffing: Number(series.minStaffing),
          requiredSkills: series.requiredSkills,
        },
      };
      props.onSubmit(body);
      return;
    }

    const body: EventBody = {
      ...sharedBody(),
      commitment: initial?.commitment ?? "short_term",
      eventDate: fromDateTimeLocal(v.eventDate).toISOString(),
      requiresClearance: v.requiresClearance,
      minAge: v.minAge ? Number(v.minAge) : null,
    };
    if (initial) props.onSubmit(body);
    else props.onSubmit(body);
  };

  const creatingLongTerm = !initial && v.commitment === "long_term";
  const showLongTermFields = creatingLongTerm || editSeries;

  return (
    <form onSubmit={submit} className="grid gap-6">
      <Card>
        <CardHeader title="Basics" />
        <CardBody className="grid gap-4">
          <Input
            label="Title"
            required
            maxLength={120}
            placeholder="Intro to Robotics — Saturday workshop"
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
          />
          <Textarea
            label="Description"
            required
            rows={6}
            hint="What volunteers will actually be doing, who the students are, and what to bring."
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
          />
          {chooseOrganizer ? (
            <OrganizerSelect value={organizerId} onChange={setOrganizerId} />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Program area"
              required
              options={PROGRAM_AREAS.map((p) => ({
                value: p,
                label: PROGRAM_AREA_LABELS[p],
              }))}
              placeholder="Choose"
              value={v.programArea}
              onChange={(e) => set("programArea", e.target.value)}
            />
            {!initial ? (
              <Select
                label="Commitment type"
                options={EVENT_COMMITMENTS.map((commitment) => ({
                  value: commitment,
                  label: EVENT_COMMITMENT_LABELS[commitment],
                }))}
                value={v.commitment}
                onChange={(e) =>
                  set(
                    "commitment",
                    e.target.value as (typeof EVENT_COMMITMENTS)[number]
                  )
                }
              />
            ) : null}
            {!showLongTermFields ? (
              <Input
                label="Event date"
                type="date"
                required
                value={v.eventDate}
                onChange={(e) => set("eventDate", e.target.value)}
              />
            ) : null}
            <Select
              label="Visibility"
              options={EVENT_VISIBILITIES.map((o) => ({
                value: o,
                label:
                  o === "public" ? "Public (listed)" : "Unlisted (link only)",
              }))}
              value={v.visibility}
              onChange={(e) => set("visibility", e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      {showLongTermFields ? (
        <LongTermProgramFields
          values={series}
          editing={editSeries}
          onChange={setSeriesValue}
        />
      ) : null}

      <Card>
        <CardHeader title="Location" />
        <CardBody className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Region"
              required
              options={REGIONS.map((r) => ({
                value: r,
                label: REGION_LABELS[r],
              }))}
              value={v.region}
              onChange={(e) => set("region", e.target.value)}
            />
            <Checkbox
              label="Virtual event"
              description="Volunteers join by link instead of in person."
              checked={v.isVirtual}
              onChange={(e) => set("isVirtual", e.target.checked)}
            />
          </div>
          {v.isVirtual ? (
            <Input
              label="Join link"
              type="url"
              required
              placeholder="https://"
              value={v.virtualLink}
              onChange={(e) => set("virtualLink", e.target.value)}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Host site"
                  placeholder="Pink STEM Discovery Lab"
                  value={v.locationName}
                  onChange={(e) => set("locationName", e.target.value)}
                />
                <Input
                  label="City"
                  value={v.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <Input
                label="Address"
                value={v.address}
                onChange={(e) => set("address", e.target.value)}
              />
              <Input
                label="Arrival note"
                placeholder="Gym entrance, park in the rear lot"
                value={v.locationNote}
                onChange={(e) => set("locationNote", e.target.value)}
              />
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Site contact name"
              value={v.siteContactName}
              onChange={(e) => set("siteContactName", e.target.value)}
            />
            <Input
              label="Site contact phone"
              type="tel"
              value={v.siteContactPhone}
              onChange={(e) => set("siteContactPhone", e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Requirements"
          description="Screening is a gate in the sign-up flow, not a note in a spreadsheet."
        />
        <CardBody className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox
              label="Requires background clearance"
              description={
                v.commitment === "long_term"
                  ? "Required for every long-term program."
                  : "Sign-ups stay pending until Pink STEM staff record a cleared screening."
              }
              checked={v.commitment === "long_term" || v.requiresClearance}
              disabled={v.commitment === "long_term"}
              onChange={(e) => set("requiresClearance", e.target.checked)}
            />
            <Checkbox
              label="Organizer approves sign-ups"
              description="Hold every sign-up for your review instead of confirming automatically."
              checked={v.requiresApproval}
              onChange={(e) => set("requiresApproval", e.target.checked)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Minimum volunteer age"
              type="number"
              min={0}
              max={99}
              placeholder="No minimum"
              value={v.commitment === "long_term" ? "18" : v.minAge}
              disabled={v.commitment === "long_term"}
              hint={
                v.commitment === "long_term"
                  ? "Long-term volunteers must be at least 18."
                  : undefined
              }
              onChange={(e) => set("minAge", e.target.value)}
            />
            <Input
              label="Cover image URL"
              type="url"
              placeholder="https://"
              value={v.coverImageUrl}
              onChange={(e) => set("coverImageUrl", e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending}>
          {creatingLongTerm ? "Create program" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
