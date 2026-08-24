"use client";

import Button from "@/components/ui/Button";
import { WithId } from "@/types/models";
import { Note } from "@/types/note";

interface NoteCardProps {
  note: WithId<Note>;
  onDelete: (noteId: string) => void;
}

export default function NoteCard({ note, onDelete }: NoteCardProps) {
  return (
    <li className="rounded-md border border-neutral-200 p-3">
      <strong className="block text-sm">{note.title}</strong>
      {note.body ? (
        <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
          {note.body}
        </p>
      ) : null}
      <Button
        variant="ghost"
        onClick={() => onDelete(note._id)}
        className="mt-2 px-0"
      >
        Delete
      </Button>
    </li>
  );
}
