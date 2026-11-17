"use client";

import { FormEvent, useState } from "react";
import { useAdminActions } from "@/components/hooks/useAdmin";
import Button from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { CLEARANCE_LABELS } from "@/constants/labels";
import type { ClientPersonDetail } from "@/http/adminHTTPClient";
import { toDateInput } from "@/lib/dates";
import { CLEARANCE_STATUSES, ClearanceStatus } from "@/types/user";

export default function ClearanceForm({
  person,
}: {
  person: ClientPersonDetail;
}) {
  const { recordClearance } = useAdminActions(person.user._id);
  const toast = useToast();
  const c = person.clearance;
  const [v, setV] = useState({
    status: (c?.status ?? "none") as ClearanceStatus,
    clearedOn: c?.clearedOn
      ? toDateInput(c.clearedOn)
      : toDateInput(new Date()),
    expiresOn: c?.expiresOn ? toDateInput(c.expiresOn) : "",
    notes: c?.notes ?? "",
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await recordClearance.mutateAsync({
        status: v.status,
        clearedOn: v.clearedOn || null,
        expiresOn: v.expiresOn || null,
        notes: v.notes,
      });
      toast("Clearance recorded and the volunteer notified.");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Select
        label="Status"
        options={CLEARANCE_STATUSES.map((s) => ({
          value: s,
          label: CLEARANCE_LABELS[s],
        }))}
        value={v.status}
        onChange={(e) =>
          setV({ ...v, status: e.target.value as ClearanceStatus })
        }
      />
      {v.status === "cleared" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Cleared on"
            type="date"
            value={v.clearedOn}
            onChange={(e) => setV({ ...v, clearedOn: e.target.value })}
          />
          <Input
            label="Expires on"
            type="date"
            required
            value={v.expiresOn}
            onChange={(e) => setV({ ...v, expiresOn: e.target.value })}
          />
        </div>
      ) : null}
      <Textarea
        label="Notes (admins only)"
        rows={2}
        value={v.notes}
        onChange={(e) => setV({ ...v, notes: e.target.value })}
      />
      <Button type="submit" loading={recordClearance.isPending}>
        Record outcome
      </Button>
    </form>
  );
}
