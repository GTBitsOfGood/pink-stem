"use client";

import { useCallback, useState } from "react";

/** Minimal controlled-form state: one object, one setter per field. */
export function useFormValues<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const set = useCallback(
    <K extends keyof T>(key: K) =>
      (value: T[K]) =>
        setValues((current) => ({ ...current, [key]: value })),
    []
  );
  return { values, set, setValues };
}
