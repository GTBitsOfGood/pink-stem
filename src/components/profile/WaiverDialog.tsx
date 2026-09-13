"use client";

import { useState } from "react";
import { usePublicSettings } from "@/components/hooks/useProfile";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { Checkbox } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Primitives";

interface WaiverDialogProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => Promise<unknown>;
}

/** Versioned waiver and code of conduct. Shown before the first sign-up and again whenever the text changes. */
export default function WaiverDialog({
  open,
  onClose,
  onAccept,
}: WaiverDialogProps) {
  const settings = usePublicSettings();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Volunteer waiver and code of conduct"
      description="Please read both before you sign up for a shift."
      size="lg"
    >
      {settings.isPending || !settings.data ? (
        <Spinner />
      ) : (
        <div className="grid gap-4">
          <section className="max-h-56 overflow-y-auto rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm leading-6 text-ink-700">
            <p className="eyebrow mb-2">
              Waiver · version {settings.data.waiverVersion}
            </p>
            <p className="whitespace-pre-wrap">{settings.data.waiverText}</p>
            <p className="eyebrow mb-2 mt-5">Code of conduct</p>
            <p className="whitespace-pre-wrap">
              {settings.data.codeOfConductText}
            </p>
          </section>
          <Checkbox
            label="I have read and agree to the waiver and code of conduct"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Not now
            </Button>
            <Button
              disabled={!agreed}
              loading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onAccept();
                  onClose();
                } finally {
                  setSaving(false);
                }
              }}
            >
              Accept and continue
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
