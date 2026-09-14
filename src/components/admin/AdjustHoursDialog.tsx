"use client";

import { FormEvent, useState } from "react";
import { useAdminActions } from "@/components/hooks/useAdmin";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { errorMessage, useToast } from "@/components/ui/Toast";
import type { ClientPersonDetail } from "@/http/adminHTTPClient";
import { formatShortDate } from "@/lib/dates";

export default function AdjustHoursDialog({
  person,
  open,
  onClose,
}: {
  person: ClientPersonDetail;
  open: boolean;
  onClose: () => void;
}) {
  const { adjustHours } = useAdminActions(person.user._id);
  const toast = useToast();
  const events = [
    ...new Map(person.ledger.map((e) => [e.eventId, e])).values(),
  ];
  const [v, setV] = useState({ eventId: "", hours: "", reason: "" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const result = await adjustHours.mutateAsync({
        volunteerId: person.user._id,
        eventId: v.eventId,
        hours: Number(v.hours),
        reason: v.reason,
      });
      toast(
        `Adjusted. New total: ${result.total} hr. Affected certificates were reissued.`
      );
      onClose();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Adjust hours"
      description="Written as a reversing ledger entry, never an edit. Any certificate covering the event is revoked and replaced."
    >
      <form onSubmit={submit} className="grid gap-4">
        <Select
          label="Event"
          required
          placeholder="Choose an event"
          options={events.map((e) => ({
            value: e.eventId,
            label: `${e.eventTitle} · ${formatShortDate(e.eventDate)}`,
          }))}
          value={v.eventId}
          onChange={(e) => setV({ ...v, eventId: e.target.value })}
        />
        <Input
          label="Change in hours"
          type="number"
          step="0.25"
          min={-24}
          max={24}
          required
          hint="Use a negative number to remove hours."
          value={v.hours}
          onChange={(e) => setV({ ...v, hours: e.target.value })}
        />
        <Textarea
          label="Reason"
          required
          value={v.reason}
          onChange={(e) => setV({ ...v, reason: e.target.value })}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={adjustHours.isPending}>
            Apply adjustment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
