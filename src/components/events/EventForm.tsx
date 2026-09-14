"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { PROGRAM_AREA_LABELS, REGION_LABELS } from "@/constants/labels";
import type { ClientEvent, EventBody } from "@/http/eventHTTPClient";
import { fromDateTimeLocal, toDateInput } from "@/lib/dates";
import { EVENT_VISIBILITIES, PROGRAM_AREAS } from "@/types/event";
import { REGIONS } from "@/types/user";

interface EventFormProps {
  initial?: ClientEvent;
  submitLabel: string;
  pending: boolean;
  onSubmit: (body: EventBody) => Promise<unknown>;
}

export default function EventForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
}: EventFormProps) {
  const [v, setV] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    programArea: initial?.programArea ?? "",
    visibility: (initial?.visibility ?? "public") as string,
    eventDate: initial ? toDateInput(initial.eventDate) : "",
    region: (initial?.region ?? "metro_atlanta") as string,
    isVirtual: initial?.isVirtual ?? false,
    virtualLink: initial?.virtualLink ?? "",
    locationName: initial?.locationName ?? "",
    address: initial?.address ?? "",
    locationNote: initial?.locationNote ?? "",
    city: initial?.city ?? "",
    requiresClearance: initial?.requiresClearance ?? true,
    requiresApproval: initial?.requiresApproval ?? false,
    minAge: initial?.minAge ? String(initial.minAge) : "",
    siteContactName: initial?.siteContactName ?? "",
    siteContactPhone: initial?.siteContactPhone ?? "",
    coverImageUrl: initial?.coverImageUrl ?? "",
  });
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) =>
    setV((s) => ({ ...s, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...v,
      programArea: v.programArea as EventBody["programArea"],
      visibility: v.visibility as EventBody["visibility"],
      region: v.region as EventBody["region"],
      eventDate: fromDateTimeLocal(v.eventDate).toISOString(),
      minAge: v.minAge ? Number(v.minAge) : null,
    });
  };

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
          <div className="grid gap-4 sm:grid-cols-3">
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
            <Input
              label="Event date"
              type="date"
              required
              value={v.eventDate}
              onChange={(e) => set("eventDate", e.target.value)}
            />
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
              description="Sign-ups stay pending until Pink STEM staff record a cleared screening."
              checked={v.requiresClearance}
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
              value={v.minAge}
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
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
