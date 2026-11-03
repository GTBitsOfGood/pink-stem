"use client";

import { useState } from "react";
import { usePublicSettings } from "@/components/hooks/useProfile";
import Button, { buttonClasses } from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { Checkbox } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Primitives";

interface WaiverDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Shows the code of conduct, sends the volunteer to Pink STEM's waiver form, then takes their word that they signed it. */
export default function WaiverDialog({
  open,
  onClose,
  onConfirm,
}: WaiverDialogProps) {
  const settings = usePublicSettings();
  const [signed, setSigned] = useState(false);
  const close = () => {
    setSigned(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Sign Pink STEM's waiver"
      description="A parent or guardian signs for volunteers under 18."
    >
      {settings.isPending || !settings.data ? (
        <Spinner />
      ) : (
        <div className="grid gap-4">
          <section className="max-h-56 overflow-y-auto rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm leading-6 text-ink-700">
            <p className="eyebrow mb-2">Code of conduct</p>
            <p className="whitespace-pre-wrap">
              {settings.data.codeOfConductText}
            </p>
          </section>
          <a
            href={settings.data.waiverFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("secondary")}
          >
            Open the waiver form
          </a>
          <Checkbox
            label="I signed the waiver"
            checked={signed}
            onChange={(e) => setSigned(e.target.checked)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Not now
            </Button>
            <Button
              disabled={!signed}
              onClick={() => {
                setSigned(false);
                onConfirm();
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
