"use client";

import { FormEvent, useState } from "react";
import { useAdminActions, useInvitations } from "@/components/hooks/useAdmin";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Field";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { formatShortDate } from "@/lib/dates";
import { emailSchema } from "@/utils/validation/common";

export default function InviteDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { invite } = useAdminActions();
  const invitations = useInvitations();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [role, setRole] = useState<"organizer" | "admin">("organizer");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // The browser lets addresses like a@b through; the server doesn't.
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError("Enter a valid email address.");
      return;
    }
    try {
      await invite.mutateAsync({ email: parsed.data, role });
      toast(`Invitation sent to ${parsed.data}.`);
      setEmail("");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Invite an organizer"
      description="Organizer and admin accounts are invitation-only. The role is fixed at invite time; the link works for seven days."
    >
      <form onSubmit={submit} className="grid gap-4">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          error={emailError}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(undefined);
          }}
        />
        <Select
          label="Role"
          options={[
            { value: "organizer", label: "Organizer — runs their own events" },
            { value: "admin", label: "Admin — full oversight" },
          ]}
          value={role}
          onChange={(e) => setRole(e.target.value as "organizer" | "admin")}
        />
        <Button type="submit" loading={invite.isPending}>
          Send invitation
        </Button>
      </form>
      {invitations.data?.length ? (
        <div className="mt-6">
          <p className="eyebrow mb-2">Pending invitations</p>
          <ul className="divide-y divide-ink-100 text-sm">
            {invitations.data.map((i) => (
              <li key={i._id} className="flex justify-between py-2">
                <span>
                  {i.email} · {i.role}
                </span>
                <span className="text-ink-500">
                  expires {formatShortDate(i.expiresAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Dialog>
  );
}
