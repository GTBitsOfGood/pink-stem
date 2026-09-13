"use client";

import { FormEvent, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { Checkbox, Input, Textarea } from "@/components/ui/Field";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { SKILL_LABELS } from "@/constants/labels";
import type { ClientShift, ShiftBody } from "@/http/eventHTTPClient";
import {
  formatHours,
  formatTimeRange,
  fromDateTimeLocal,
  hoursBetween,
  toDateTimeLocal,
} from "@/lib/dates";
import { SKILLS, Skill } from "@/types/user";

interface ShiftEditorProps {
  shifts: ClientShift[];
  eventDate: string;
  editable: boolean;
  onAdd: (body: ShiftBody) => Promise<unknown>;
  onUpdate: (shiftId: string, body: ShiftBody) => Promise<unknown>;
  onDelete: (shiftId: string) => Promise<unknown>;
}

const blank = (eventDate: string) => {
  const day = toDateTimeLocal(eventDate).slice(0, 10);
  return {
    roleName: "",
    description: "",
    startsAt: `${day}T09:00`,
    endsAt: `${day}T12:00`,
    capacity: "4",
    minStaffing: "2",
    requiredSkills: [] as Skill[],
  };
};

export default function ShiftEditor({
  shifts,
  eventDate,
  editable,
  onAdd,
  onUpdate,
  onDelete,
}: ShiftEditorProps) {
  const toast = useToast();
  const [editing, setEditing] = useState<{
    id?: string;
    values: ReturnType<typeof blank>;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => setEditing({ values: blank(eventDate) });
  const openEdit = (s: ClientShift) =>
    setEditing({
      id: s._id,
      values: {
        roleName: s.roleName,
        description: s.description ?? "",
        startsAt: toDateTimeLocal(s.startsAt),
        endsAt: toDateTimeLocal(s.endsAt),
        capacity: String(s.capacity),
        minStaffing: String(s.minStaffing),
        requiredSkills: s.requiredSkills,
      },
    });
  const set = <K extends keyof ReturnType<typeof blank>>(
    key: K,
    value: ReturnType<typeof blank>[K]
  ) =>
    setEditing((e) =>
      e ? { ...e, values: { ...e.values, [key]: value } } : e
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const body: ShiftBody = {
      roleName: editing.values.roleName,
      description: editing.values.description || undefined,
      startsAt: fromDateTimeLocal(editing.values.startsAt).toISOString(),
      endsAt: fromDateTimeLocal(editing.values.endsAt).toISOString(),
      capacity: Number(editing.values.capacity),
      minStaffing: Number(editing.values.minStaffing),
      requiredSkills: editing.values.requiredSkills,
    };
    setSaving(true);
    try {
      await (editing.id ? onUpdate(editing.id, body) : onAdd(body));
      setEditing(null);
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-3">
      {shifts.length ? (
        <ul className="grid gap-2">
          {shifts.map((s) => (
            <li
              key={s._id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900">{s.roleName}</p>
                <p className="text-[13px] text-ink-600">
                  {formatTimeRange(s.startsAt, s.endsAt)} ·{" "}
                  {formatHours(hoursBetween(s.startsAt, s.endsAt))} ·{" "}
                  {s.filledCount}/{s.capacity} filled
                  {s.waitlistCount ? ` · ${s.waitlistCount} waitlisted` : ""} ·
                  min {s.minStaffing}
                </p>
              </div>
              {editable ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => openEdit(s)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={async () => {
                      if (window.confirm(`Delete the ${s.roleName} shift?`)) {
                        try {
                          await onDelete(s._id);
                        } catch (error) {
                          toast(errorMessage(error), "error");
                        }
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-ink-300 p-4 text-center text-sm text-ink-500">
          No shifts yet. Add at least one before publishing.
        </p>
      )}
      {editable ? (
        <Button
          variant="secondary"
          icon={<Plus className="h-4 w-4" />}
          onClick={openNew}
          className="justify-self-start"
        >
          Add shift
        </Button>
      ) : null}

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit shift" : "Add a shift"}
        description="Shifts are what volunteers sign up for. Keep roles concrete: “Robotics table lead”, not “Helper”."
        size="lg"
      >
        {editing ? (
          <form onSubmit={submit} className="grid gap-4">
            <Input
              label="Role name"
              required
              maxLength={80}
              value={editing.values.roleName}
              onChange={(e) => set("roleName", e.target.value)}
            />
            <Textarea
              label="What this role does"
              rows={3}
              value={editing.values.description}
              onChange={(e) => set("description", e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Starts"
                type="datetime-local"
                required
                value={editing.values.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
              />
              <Input
                label="Ends"
                type="datetime-local"
                required
                value={editing.values.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Capacity"
                type="number"
                min={1}
                max={500}
                required
                value={editing.values.capacity}
                onChange={(e) => set("capacity", e.target.value)}
                hint="Cannot drop below the number already holding a spot."
              />
              <Input
                label="Minimum staffing"
                type="number"
                min={0}
                max={500}
                required
                value={editing.values.minStaffing}
                onChange={(e) => set("minStaffing", e.target.value)}
                hint="You are alerted 72 hours out if fill is below this."
              />
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold text-ink-800">
                Helpful skills (optional)
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {SKILLS.map((skill) => (
                  <Checkbox
                    key={skill}
                    label={SKILL_LABELS[skill]}
                    className="py-2"
                    checked={editing.values.requiredSkills.includes(skill)}
                    onChange={(e) =>
                      set(
                        "requiredSkills",
                        e.target.checked
                          ? [...editing.values.requiredSkills, skill]
                          : editing.values.requiredSkills.filter(
                              (s) => s !== skill
                            )
                      )
                    }
                  />
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editing.id ? "Save shift" : "Add shift"}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}
