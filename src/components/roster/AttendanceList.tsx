"use client";

import { useState } from "react";
import { Check, Pencil, UserX } from "lucide-react";
import { useMarkAttendance } from "@/components/hooks/useEvents";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Field";
import { errorMessage, useToast } from "@/components/ui/Toast";
import type { ClientRoster } from "@/http/eventHTTPClient";
import type { RosterEntry } from "@/types/api";
import type { Serialized } from "@/types/models";
import { formatHours, formatTimeRange, hoursBetween } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Entry = Serialized<RosterEntry>;

/**
 * The single most important screen on a small phone with poor signal:
 * large one-handed toggles, one save per tap, retries on failure.
 */
export default function AttendanceList({
  roster,
  locked,
}: {
  roster: ClientRoster;
  locked: boolean;
}) {
  const mark = useMarkAttendance(roster.event._id);
  const toast = useToast();
  const [adjusting, setAdjusting] = useState<{
    entry: Entry;
    hours: string;
    reason: string;
  } | null>(null);

  const save = async (
    signupId: string,
    body: Parameters<typeof mark.mutateAsync>[0]["body"]
  ) => {
    try {
      await mark.mutateAsync({ signupId, body });
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <div className="grid gap-6">
      {roster.shifts.map((shift) => {
        const confirmed = roster.entries.filter(
          (e) =>
            e.signup.shiftId === shift._id &&
            ["confirmed", "attended", "no_show"].includes(e.signup.status)
        );
        const scheduled = hoursBetween(shift.startsAt, shift.endsAt);
        return (
          <section key={shift._id}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-bold text-ink-900">
                {shift.roleName}
              </h2>
              <p className="text-[13px] text-ink-500">
                {formatTimeRange(shift.startsAt, shift.endsAt)} ·{" "}
                {formatHours(scheduled)}
              </p>
            </div>
            {confirmed.length ? (
              <ul className="grid gap-2">
                {confirmed.map((entry) => {
                  const a = entry.signup.attendance;
                  const status = a?.status;
                  const busy =
                    mark.isPending &&
                    mark.variables?.signupId === entry.signup._id;
                  return (
                    <li
                      key={entry.signup._id}
                      className={cn(
                        "grid gap-3 rounded-2xl border bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center",
                        status === "attended"
                          ? "border-emerald-300"
                          : status === "no_show"
                            ? "border-red-300"
                            : "border-ink-200"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-bold text-ink-900">
                            {entry.volunteer.firstName}{" "}
                            {entry.volunteer.lastName}
                          </p>
                          <Badge tone={entry.cleared ? "success" : "warning"}>
                            {entry.cleared ? "Cleared" : "Not cleared"}
                          </Badge>
                        </div>
                        <p className="text-[13px] text-ink-500">
                          {status === "attended"
                            ? `Attended · ${formatHours(a!.hours)}${a!.adjustmentReason ? ` (adjusted: ${a!.adjustmentReason})` : ""}`
                            : status === "no_show"
                              ? "No-show · 0 hr"
                              : "Not marked yet"}
                        </p>
                      </div>
                      {!locked ? (
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:flex">
                          <Button
                            size="lg"
                            variant={
                              status === "attended" ? "primary" : "secondary"
                            }
                            aria-pressed={status === "attended"}
                            loading={busy}
                            icon={<Check className="h-5 w-5" />}
                            onClick={() =>
                              save(entry.signup._id, { status: "attended" })
                            }
                          >
                            Attended
                          </Button>
                          <Button
                            size="lg"
                            variant={
                              status === "no_show" ? "danger" : "secondary"
                            }
                            aria-pressed={status === "no_show"}
                            loading={busy}
                            icon={<UserX className="h-5 w-5" />}
                            onClick={() =>
                              save(entry.signup._id, { status: "no_show" })
                            }
                          >
                            No-show
                          </Button>
                          <Button
                            size="lg"
                            variant="ghost"
                            aria-label="Adjust hours"
                            disabled={status !== "attended"}
                            onClick={() =>
                              setAdjusting({
                                entry,
                                hours: String(a?.hours ?? scheduled),
                                reason: a?.adjustmentReason ?? "",
                              })
                            }
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-ink-300 p-4 text-center text-sm text-ink-500">
                Nobody confirmed for this shift.
              </p>
            )}
          </section>
        );
      })}

      <Dialog
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        title="Adjust hours"
        description="Hours default to the scheduled shift length. A reason is required for any change and is kept on the record."
      >
        {adjusting ? (
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await save(adjusting.entry.signup._id, {
                status: "attended",
                hours: Number(adjusting.hours),
                adjustmentReason: adjusting.reason || undefined,
              });
              setAdjusting(null);
            }}
          >
            <Input
              label={`Hours for ${adjusting.entry.volunteer.firstName}`}
              type="number"
              step="0.25"
              min={0}
              max={16}
              required
              value={adjusting.hours}
              onChange={(e) =>
                setAdjusting({ ...adjusting, hours: e.target.value })
              }
            />
            <Textarea
              label="Reason"
              placeholder="Left early at 11:30 to pick up a sibling"
              value={adjusting.reason}
              onChange={(e) =>
                setAdjusting({ ...adjusting, reason: e.target.value })
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAdjusting(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save hours</Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}
