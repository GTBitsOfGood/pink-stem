"use client";

import { Send } from "lucide-react";
import { useMutationState } from "@tanstack/react-query";
import {
  RESEND_VERIFICATION_KEY,
  useProfile,
} from "@/components/hooks/useProfile";
import Button from "@/components/ui/Button";
import { errorMessage, isRateLimited, useToast } from "@/components/ui/Toast";

/**
 * Resends the email verification link. Every instance reads the same mutation
 * history, so one rate-limited attempt blocks all of them on the page.
 */
export default function ResendVerificationButton() {
  const { resendEmailVerification } = useProfile();
  const toast = useToast();
  const attempts = useMutationState({
    filters: { mutationKey: RESEND_VERIFICATION_KEY },
    select: (m) => m.state,
  });
  const blocked = attempts.some((a) => isRateLimited(a.error));
  const pending = attempts.some((a) => a.status === "pending");

  if (blocked) {
    return (
      <span className="text-[13px] text-amber-800">
        Resend limit reached. Try again in an hour, or use the link from an
        earlier email.
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      icon={<Send className="h-3.5 w-3.5" />}
      loading={pending}
      onClick={() =>
        resendEmailVerification.mutate(undefined, {
          onSuccess: () => toast("Verification link re-sent to your email."),
          onError: (error) => {
            if (!isRateLimited(error)) toast(errorMessage(error), "error");
          },
        })
      }
    >
      Resend verification link
    </Button>
  );
}
