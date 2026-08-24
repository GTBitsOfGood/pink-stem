"use client";

import NoteCard from "@/components/notes/NoteCard";
import { NOTE_EMPTY_STATE_MESSAGE } from "@/constants/notes";
import { WithId } from "@/types/models";
import { Note } from "@/types/note";

interface NoteListProps {
  notes: WithId<Note>[];
  isLoading: boolean;
  onDelete: (noteId: string) => void;
}

export default function NoteList({
  notes,
  isLoading,
  onDelete,
}: NoteListProps) {
  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading notes...</p>;
  }

  if (notes.length === 0) {
    return (
      <p className="text-sm text-neutral-500">{NOTE_EMPTY_STATE_MESSAGE}</p>
    );
  }

  return (
    <ul className="grid list-none gap-3 p-0">
      {notes.map((note) => (
        <NoteCard key={note._id} note={note} onDelete={onDelete} />
      ))}
    </ul>
  );
}
