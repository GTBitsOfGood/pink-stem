"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import { MAX_NOTE_TITLE_LENGTH } from "@/constants/notes";

interface NoteFormProps {
  onSubmit: (title: string, body: string) => Promise<void>;
}

export default function NoteForm({ onSubmit }: NoteFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(title, body);
      setTitle("");
      setBody("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 grid gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        maxLength={MAX_NOTE_TITLE_LENGTH}
        required
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Body"
        rows={3}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add"}
      </Button>
    </form>
  );
}
