"use client";

import { useState } from "react";
import { useOrganizers } from "@/components/hooks/useAdmin";
import { useEventActions } from "@/components/hooks/useEvents";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Field";
import { errorMessage, useToast } from "@/components/ui/Toast";
import type { ClientEvent } from "@/http/eventHTTPClient";

export default function ReassignDialog({
  event,
  onClose,
}: {
  event: ClientEvent;
  onClose: () => void;
}) {
  const organizers = useOrganizers();
  const { reassign } = useEventActions(event._id);
  const toast = useToast();
  const [organizerId, setOrganizerId] = useState(String(event.organizerId));

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Reassign “${event.title}”`}
      description="Open conversations move to the new organizer. Past approvals keep their original attribution."
    >
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await reassign.mutateAsync(organizerId);
            toast("Event reassigned and the new organizer notified.");
            onClose();
          } catch (error) {
            toast(errorMessage(error), "error");
          }
        }}
      >
        <Select
          label="New organizer"
          required
          options={(organizers.data ?? []).map((o) => ({
            value: o._id,
            label: `${o.name} · ${o.role}`,
          }))}
          value={organizerId}
          onChange={(e) => setOrganizerId(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={reassign.isPending}>
            Reassign
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
