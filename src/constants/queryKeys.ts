/** React Query cache keys. Every hook reads its keys from here. */
export const QUERY_KEYS = {
  session: ["session"] as const,
  events: (filters: Record<string, string>) => ["events", filters] as const,
  event: (id: string) => ["events", id] as const,
  eventUpdates: (id: string) => ["events", id, "updates"] as const,
  eventRoster: (id: string) => ["events", id, "roster"] as const,
  organizerEvents: ["organizer", "events"] as const,
  mySignups: ["me", "signups"] as const,
  myHours: ["me", "hours"] as const,
  myCertificates: ["me", "certificates"] as const,
  threads: (filters: Record<string, string>) => ["threads", filters] as const,
  thread: (id: string) => ["threads", id] as const,
  settings: ["settings"] as const,
  publicSettings: ["settings", "public"] as const,
  admin: {
    overview: ["admin", "overview"] as const,
    people: (filters: Record<string, string>) =>
      ["admin", "people", filters] as const,
    person: (id: string) => ["admin", "people", id] as const,
    events: (filters: Record<string, string>) =>
      ["admin", "events", filters] as const,
    threads: (filters: Record<string, string>) =>
      ["admin", "threads", filters] as const,
    audit: (filters: Record<string, string>) =>
      ["admin", "audit", filters] as const,
    report: (kind: string, filters: Record<string, string>) =>
      ["admin", "reports", kind, filters] as const,
  },
};
