"use client";

import NoteForm from "@/components/notes/NoteForm";
import NoteList from "@/components/notes/NoteList";
import { useNotes } from "@/components/hooks/useNotes";

export default function Home() {
  const { notes, isLoading, error, createNote, deleteNote } = useNotes();

  return (
    <main className="mx-auto my-8 max-w-2xl px-4">
      <h1 className="mb-6 text-2xl font-semibold">Notes</h1>

      {error ? (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <NoteForm onSubmit={createNote} />
      <NoteList notes={notes} isLoading={isLoading} onDelete={deleteNote} />
    </main>
  );
}
