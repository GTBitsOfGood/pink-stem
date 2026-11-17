"use client";

import { Search } from "lucide-react";
import { Checkbox, Select, inputClasses } from "@/components/ui/Field";
import { PROGRAM_AREA_LABELS, REGION_LABELS } from "@/constants/labels";
import { PROGRAM_AREAS } from "@/types/event";
import { REGIONS } from "@/types/user";

export interface EventFilterValues {
  q: string;
  programArea: string;
  where: string;
  from: string;
  to: string;
  hasSpots: boolean;
}

export const EMPTY_EVENT_FILTERS: EventFilterValues = {
  q: "",
  programArea: "",
  where: "",
  from: "",
  to: "",
  hasSpots: false,
};

export default function EventFilters({
  values,
  onChange,
}: {
  values: EventFilterValues;
  onChange: (values: EventFilterValues) => void;
}) {
  const set = <K extends keyof EventFilterValues>(
    key: K,
    value: EventFilterValues[K]
  ) => onChange({ ...values, [key]: value });
  return (
    <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
      <label className="relative">
        <span className="sr-only">Search events</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          placeholder="Search events"
          value={values.q}
          onChange={(e) => set("q", e.target.value)}
          className={inputClasses(false, "pl-9")}
        />
      </label>
      <Select
        label="Program"
        className="[&>label]:sr-only"
        options={PROGRAM_AREAS.map((p) => ({
          value: p,
          label: PROGRAM_AREA_LABELS[p],
        }))}
        placeholder="All programs"
        value={values.programArea}
        onChange={(e) => set("programArea", e.target.value)}
      />
      <Select
        label="Location"
        className="[&>label]:sr-only"
        options={[
          ...REGIONS.map((r) => ({ value: r, label: REGION_LABELS[r] })),
          { value: "virtual", label: "Virtual" },
        ]}
        placeholder="Anywhere"
        value={values.where}
        onChange={(e) => set("where", e.target.value)}
      />
      <label className="grid gap-1">
        <span className="sr-only">From date</span>
        <input
          type="date"
          aria-label="From date"
          value={values.from}
          onChange={(e) => set("from", e.target.value)}
          className={inputClasses()}
        />
      </label>
      <Checkbox
        label="Spots open"
        checked={values.hasSpots}
        onChange={(e) => set("hasSpots", e.target.checked)}
        className="h-10 items-center py-0"
      />
    </div>
  );
}
