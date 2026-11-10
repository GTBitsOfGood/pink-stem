"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useProfile } from "@/components/hooks/useProfile";
import Button from "@/components/ui/Button";
import { errorMessage, isRateLimited, useToast } from "@/components/ui/Toast";

export default function ResendVerificationButton() {
  const { resendEmailVerification } = useProfile();
  const toast = useToast();
  const [blocked, setBlocked] = useState(false);

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
      loading={resendEmailVerification.isPending}
      onClick={() =>
        resendEmailVerification.mutate(undefined, {
          onSuccess: () => toast("Verification link re-sent to your email."),
          onError: (error) =>
            isRateLimited(error)
              ? setBlocked(true)
              : toast(errorMessage(error), "error"),
        })
      }
    >
      Resend verification link
    </Button>
  );
}
