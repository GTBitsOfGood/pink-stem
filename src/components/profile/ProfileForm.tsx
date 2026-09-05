"use client";

import { FormEvent, useState } from "react";
import { useProfile } from "@/components/hooks/useProfile";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { errorMessage, useToast } from "@/components/ui/Toast";
import {
  NOTIFICATION_CATEGORY_LABELS,
  REGION_LABELS,
  SKILL_LABELS,
} from "@/constants/labels";
import { MAX_BIO_LENGTH } from "@/constants/limits";
import type { ClientUser } from "@/http/authHTTPClient";
import { isMinor, toDateInput } from "@/lib/dates";
import {
  NOTIFICATION_CATEGORIES,
  REGIONS,
  SHIRT_SIZES,
  SKILLS,
  Skill,
} from "@/types/user";

const SKILL_OPTIONS = SKILLS.map((s) => ({ value: s, label: SKILL_LABELS[s] }));

export default function ProfileForm({ user }: { user: ClientUser }) {
  const { update } = useProfile();
  const toast = useToast();
  const [values, setValues] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? "",
    city: user.city ?? "",
    region: user.region ?? "",
    dateOfBirth: user.dateOfBirth ? toDateInput(user.dateOfBirth) : "",
    guardianEmail: user.guardianEmail ?? "",
    emergencyName: user.emergencyContact?.name ?? "",
    emergencyPhone: user.emergencyContact?.phone ?? "",
    skills: user.skills,
    interests: user.interests,
    shirtSize: user.shirtSize ?? "",
    bio: user.bio ?? "",
    notificationPreferences: user.notificationPreferences,
  });
  const set = <K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K]
  ) => setValues((v) => ({ ...v, [key]: value }));
  const toggle = (key: "skills" | "interests", skill: Skill) =>
    set(
      key,
      values[key].includes(skill)
        ? values[key].filter((s) => s !== skill)
        : [...values[key], skill]
    );
  const minor = values.dateOfBirth ? isMinor(values.dateOfBirth) : false;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        city: values.city,
        region: (values.region || undefined) as
          (typeof REGIONS)[number] | undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        guardianEmail: values.guardianEmail,
        emergencyContact: {
          name: values.emergencyName,
          phone: values.emergencyPhone,
        },
        skills: values.skills,
        interests: values.interests,
        shirtSize: (values.shirtSize || undefined) as
          (typeof SHIRT_SIZES)[number] | undefined,
        bio: values.bio,
        notificationPreferences: values.notificationPreferences,
      });
      toast("Profile saved.");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  const skillGrid = (key: "skills" | "interests") => (
    <div className="grid gap-2 sm:grid-cols-2">
      {SKILL_OPTIONS.map((o) => (
        <Checkbox
          key={o.value}
          label={o.label}
          checked={values[key].includes(o.value)}
          onChange={() => toggle(key, o.value)}
          className="py-2"
        />
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-6">
      <Card>
        <CardHeader title="About you" />
        <CardBody className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              required
              value={values.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
            <Input
              label="Last name"
              required
              value={values.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              value={user.email}
              disabled
              hint="Contact Pink STEM to change your email."
            />
            <Input
              label="Phone"
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="City"
              value={values.city}
              onChange={(e) => set("city", e.target.value)}
            />
            <Select
              label="Region"
              options={REGIONS.map((r) => ({
                value: r,
                label: REGION_LABELS[r],
              }))}
              placeholder="Choose"
              value={values.region}
              onChange={(e) => set("region", e.target.value)}
            />
            <Select
              label="Shirt size"
              options={SHIRT_SIZES.map((s) => ({ value: s, label: s }))}
              placeholder="Choose"
              value={values.shirtSize}
              onChange={(e) => set("shirtSize", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Date of birth"
              type="date"
              required
              value={values.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              hint="Used for age requirements only."
            />
            {minor ? (
              <Input
                label="Parent or guardian email"
                type="email"
                required
                value={values.guardianEmail}
                onChange={(e) => set("guardianEmail", e.target.value)}
                hint="Changing this address restarts consent."
              />
            ) : null}
          </div>
          <Textarea
            label="Short bio"
            hint={`Up to ${MAX_BIO_LENGTH} characters. Organizers see this when you are on their roster.`}
            maxLength={MAX_BIO_LENGTH}
            value={values.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Emergency contact"
          description="Only Pink STEM staff can see this. It is never included in organizer exports."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={values.emergencyName}
            onChange={(e) => set("emergencyName", e.target.value)}
          />
          <Input
            label="Phone"
            type="tel"
            value={values.emergencyPhone}
            onChange={(e) => set("emergencyPhone", e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Skills"
          description="What you can lead or support. Shifts may list helpful skills."
        />
        <CardBody>{skillGrid("skills")}</CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Interests"
          description="Program areas you would like to hear about."
        />
        <CardBody>{skillGrid("interests")}</CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Email preferences"
          description="Confirmations for your own sign-ups and important changes are always sent."
        />
        <CardBody className="grid gap-2 sm:grid-cols-2">
          {NOTIFICATION_CATEGORIES.filter(
            (c) => c !== "digests" || user.role !== "volunteer"
          ).map((category) => (
            <Checkbox
              key={category}
              label={NOTIFICATION_CATEGORY_LABELS[category].label}
              description={NOTIFICATION_CATEGORY_LABELS[category].description}
              checked={values.notificationPreferences[category]}
              onChange={(e) =>
                set("notificationPreferences", {
                  ...values.notificationPreferences,
                  [category]: e.target.checked,
                })
              }
            />
          ))}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={update.isPending}>
          Save profile
        </Button>
      </div>
    </form>
  );
}
