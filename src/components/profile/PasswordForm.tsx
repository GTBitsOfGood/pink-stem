"use client";

import { FormEvent } from "react";
import { useAuthActions } from "@/components/hooks/useAuthActions";
import { useFormValues } from "@/components/hooks/useFormValues";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { PASSWORD_MIN_LENGTH } from "@/constants/limits";

const EMPTY = { currentPassword: "", newPassword: "" };

export default function PasswordForm() {
  const { changePassword } = useAuthActions();
  const toast = useToast();
  const { values, set, setValues } = useFormValues(EMPTY);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await changePassword.mutateAsync(values);
      setValues(EMPTY);
      toast("Password changed. You have been signed out everywhere else.");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Password"
        description="Changing it signs you out everywhere else."
      />
      <CardBody>
        <form onSubmit={submit} className="grid gap-3">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={values.currentPassword}
            onChange={(e) => set("currentPassword")(e.target.value)}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
            value={values.newPassword}
            onChange={(e) => set("newPassword")(e.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={changePassword.isPending}
          >
            Change password
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
