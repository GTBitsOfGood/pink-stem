"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { HTTPError } from "@/types/exceptions";

/**
 * Holds the app-wide React Query client. Created in state so each browser
 * session gets exactly one client and the cache survives re-renders.
 */
export default function QueryProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            // Auth and permission failures are answers, not transient faults.
            retry: (count, error) =>
              !(error instanceof HTTPError && error.status < 500) && count < 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
