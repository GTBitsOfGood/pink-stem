"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { QUERY_KEYS } from "@/constants/queryKeys";
import AuthHTTPClient, { Me } from "@/http/authHTTPClient";

/**
 * The signed-in user, shared by every screen. `null` means signed out.
 * Mutations that change the session write straight into this cache.
 */
export function useSession() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const query = useQuery<Me | null>({
    queryKey: QUERY_KEYS.session,
    queryFn: () => AuthHTTPClient.me(),
    staleTime: 60_000,
  });

  const logout = useMutation({
    mutationFn: () => AuthHTTPClient.logout(),
    onSuccess: () => {
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
  });

  return {
    me: query.data ?? null,
    user: query.data?.user ?? null,
    isLoading: query.isPending,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session }),
    setMe: (me: Me) => queryClient.setQueryData(QUERY_KEYS.session, me),
    logout: () => logout.mutate(),
  };
}
