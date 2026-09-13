"use client";

import { AlertTriangle, Lock, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Primitives";
import type { ClientUpdate } from "@/http/eventHTTPClient";
import { UPDATE_KIND_LABELS } from "@/constants/labels";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface UpdatesFeedProps {
  updates: ClientUpdate[];
  canManage?: boolean;
  onEdit?: (updateId: string, body: string) => Promise<unknown>;
  onDelete?: (updateId: string) => Promise<unknown>;
}

export default function UpdatesFeed({
  updates,
  canManage,
  onEdit,
  onDelete,
}: UpdatesFeedProps) {
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(
    null
  );

  if (!updates.length) {
    return (
      <EmptyState
        title="No updates yet"
        description="Organizers post notes and important changes here. Anything marked important is also emailed to everyone signed up."
      />
    );
  }

  return (
    <ul className="grid gap-3">
      {updates.map((update) => {
        const important = update.kind === "important";
        return (
          <li
            key={update._id}
            className={cn(
              "rounded-2xl border p-4",
              important
                ? "border-amber-300 bg-amber-50"
                : "border-ink-200 bg-white"
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
              {important ? (
                <Badge tone="warning">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {UPDATE_KIND_LABELS.important}
                </Badge>
              ) : (
                <Badge>{UPDATE_KIND_LABELS.note}</Badge>
              )}
              {update.rosterOnly ? (
                <Badge tone="info">
                  <Lock className="mr-1 h-3 w-3" />
                  Roster only
                </Badge>
              ) : null}
              <span>
                {update.authorName} · {formatDateTime(update.postedAt)}
              </span>
              {update.editedAt ? (
                <span className="italic">
                  edited {formatDateTime(update.editedAt)}
                </span>
              ) : null}
            </div>
            {editing?.id === update._id ? (
              <form
                className="mt-3 grid gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onEdit?.(update._id, editing.body);
                  setEditing(null);
                }}
              >
                <Textarea
                  label="Edit update"
                  className="[&>label]:sr-only"
                  value={editing.body}
                  onChange={(e) =>
                    setEditing({ id: update._id, body: e.target.value })
                  }
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-800">
                {update.body}
              </p>
            )}
            {canManage && editing?.id !== update._id ? (
              <div className="mt-3 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={() =>
                    setEditing({ id: update._id, body: update.body })
                  }
                >
                  Edit
                </Button>
                {!(important && update.notifiedAt) ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => onDelete?.(update._id)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
