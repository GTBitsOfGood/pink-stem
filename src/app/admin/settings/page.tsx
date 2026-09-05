"use client";

import { FormEvent, useState } from "react";
import { useAdminActions, useOrgSettings } from "@/components/hooks/useAdmin";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox, Input, Textarea } from "@/components/ui/Field";
import { PageHeader, Spinner } from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";
import type { OrgSettings } from "@/types/settings";

type Form = Omit<
  OrgSettings,
  | "waiverVersion"
  | "cancellationCutoffHours"
  | "autoPromoteCutoffHours"
  | "noShowThreshold"
  | "noShowWindowDays"
> & {
  cancellationCutoffHours: string;
  autoPromoteCutoffHours: string;
  noShowThreshold: string;
  noShowWindowDays: string;
  bumpWaiverVersion: boolean;
};

export default function SettingsPage() {
  const settings = useOrgSettings();
  if (!settings.data) return <Spinner />;
  return (
    <SettingsForm key={settings.data.waiverVersion} initial={settings.data} />
  );
}

function SettingsForm({ initial }: { initial: OrgSettings }) {
  const { updateSettings } = useAdminActions();
  const toast = useToast();
  const [v, setV] = useState<Form>({
    ...initial,
    cancellationCutoffHours: String(initial.cancellationCutoffHours),
    autoPromoteCutoffHours: String(initial.autoPromoteCutoffHours),
    noShowThreshold: String(initial.noShowThreshold),
    noShowWindowDays: String(initial.noShowWindowDays),
    bumpWaiverVersion: false,
  });
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setV({ ...v, [key]: value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({
        ...v,
        cancellationCutoffHours: Number(v.cancellationCutoffHours),
        autoPromoteCutoffHours: Number(v.autoPromoteCutoffHours),
        noShowThreshold: Number(v.noShowThreshold),
        noShowWindowDays: Number(v.noShowWindowDays),
      });
      setV({ ...v, bumpWaiverVersion: false });
      toast("Settings saved.");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-6">
      <PageHeader
        title="Settings"
        description="Organization details appear on emails and certificates. Rules below drive the sign-up and roster flows."
      />
      <Card>
        <CardHeader title="Organization" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            required
            value={v.orgName}
            onChange={(e) => set("orgName", e.target.value)}
          />
          <Input
            label="Website"
            type="url"
            required
            value={v.website}
            onChange={(e) => set("website", e.target.value)}
          />
          <Input
            label="Address line 1"
            required
            value={v.addressLine1}
            onChange={(e) => set("addressLine1", e.target.value)}
          />
          <Input
            label="Address line 2"
            required
            value={v.addressLine2}
            onChange={(e) => set("addressLine2", e.target.value)}
          />
          <Input
            label="Phone"
            required
            value={v.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            required
            value={v.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Certificate signatory"
          description="Printed on every certificate and service record with the organization's contact details."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            required
            value={v.signatoryName}
            onChange={(e) => set("signatoryName", e.target.value)}
          />
          <Input
            label="Title"
            required
            value={v.signatoryTitle}
            onChange={(e) => set("signatoryTitle", e.target.value)}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Waiver and code of conduct"
          description={`Currently version ${initial.waiverVersion}. Publishing a new version makes every volunteer re-accept at their next sign-up.`}
        />
        <CardBody className="grid gap-4">
          <Textarea
            label="Waiver text"
            rows={8}
            required
            value={v.waiverText}
            onChange={(e) => set("waiverText", e.target.value)}
          />
          <Textarea
            label="Code of conduct"
            rows={8}
            required
            value={v.codeOfConductText}
            onChange={(e) => set("codeOfConductText", e.target.value)}
          />
          <Checkbox
            label="Publish as a new version"
            description="Volunteers will be asked to accept the updated text before their next sign-up."
            checked={v.bumpWaiverVersion}
            onChange={(e) => set("bumpWaiverVersion", e.target.checked)}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Rules" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Self-cancellation cutoff (hours before start)"
            type="number"
            min={0}
            max={168}
            required
            value={v.cancellationCutoffHours}
            onChange={(e) => set("cancellationCutoffHours", e.target.value)}
          />
          <Input
            label="No automatic waitlist promotion inside (hours)"
            type="number"
            min={0}
            max={168}
            required
            value={v.autoPromoteCutoffHours}
            onChange={(e) => set("autoPromoteCutoffHours", e.target.value)}
          />
          <Input
            label="No-shows before flagging for review"
            type="number"
            min={1}
            max={20}
            required
            value={v.noShowThreshold}
            onChange={(e) => set("noShowThreshold", e.target.value)}
          />
          <Input
            label="No-show review window (days)"
            type="number"
            min={7}
            max={365}
            required
            value={v.noShowWindowDays}
            onChange={(e) => set("noShowWindowDays", e.target.value)}
          />
        </CardBody>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={updateSettings.isPending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
