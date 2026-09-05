"use client";

import { useState } from "react";

/** The moment the screen rendered, stable across re-renders. */
export function useNow() {
  const [now] = useState(() => Date.now());
  return now;
}
