"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NOTE_QUERY_KEYS } from "@/constants/notes";
import NoteHTTPClient from "@/http/noteHTTPClient";
import { WithId } from "@/types/models";
import { Note } from "@/types/note";

/**
 * Owns note list state and the mutations against it, so components stay
 * presentational. All network access goes through NoteHTTPClient.
 */
export function useNotes() {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.all });

  const {
    data: notes = [],
    isPending,
    error: queryError,
  } = useQuery<WithId<Note>[]>({
    queryKey: NOTE_QUERY_KEYS.all,
    queryFn: () => NoteHTTPClient.getNotes(),
  });

  const createMutation = useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) =>
      NoteHTTPClient.createNote(title, body),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => NoteHTTPClient.deleteNote(noteId),
    onSuccess: invalidate,
  });

  const error =
    queryError ?? createMutation.error ?? deleteMutation.error ?? null;

  return {
    notes,
    isLoading: isPending,
    error: error ? error.message : null,
    createNote: async (title: string, body: string) => {
      await createMutation.mutateAsync({ title, body });
    },
    deleteNote: (noteId: string) => deleteMutation.mutate(noteId),
  };
}
