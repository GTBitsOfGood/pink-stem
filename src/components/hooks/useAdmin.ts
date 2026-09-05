"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import AdminHTTPClient, { ClearanceBody } from "@/http/adminHTTPClient";
import CertificateHTTPClient from "@/http/certificateHTTPClient";
import { compactFilters as clean } from "@/http/fetchHTTPClient";
import type {
  AdjustHoursInput,
  InviteInput,
  ReportKind,
  SettingsInput,
  UpdateUserInput,
} from "@/utils/validation/admin";

type Filters = Record<string, string | undefined>;

export function useAdminOverview() {
  return useQuery({
    queryKey: QUERY_KEYS.admin.overview,
    queryFn: () => AdminHTTPClient.overview(),
  });
}

export function usePeople(filters: Filters) {
  const f = clean(filters);
  return useQuery({
    queryKey: QUERY_KEYS.admin.people(f),
    queryFn: () => AdminHTTPClient.people(f),
    placeholderData: (p) => p,
  });
}

export function usePerson(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.admin.person(userId),
    queryFn: () => AdminHTTPClient.person(userId),
    enabled: !!userId,
  });
}

export function useAdminEvents(filters: Filters) {
  const f = clean(filters);
  return useQuery({
    queryKey: QUERY_KEYS.admin.events(f),
    queryFn: () => AdminHTTPClient.events(f),
    placeholderData: (p) => p,
  });
}

export function useAuditLog(filters: Filters) {
  const f = clean(filters);
  return useQuery({
    queryKey: QUERY_KEYS.admin.audit(f),
    queryFn: () => AdminHTTPClient.audit(f),
    placeholderData: (p) => p,
  });
}

export function useReport(kind: ReportKind, from: string, to: string) {
  return useQuery({
    queryKey: QUERY_KEYS.admin.report(kind, { from, to }),
    queryFn: () => AdminHTTPClient.report(kind, from, to),
    enabled: !!from && !!to,
    placeholderData: (p) => p,
  });
}

export function useOrgSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.settings,
    queryFn: () => AdminHTTPClient.settings(),
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: ["admin", "invitations"],
    queryFn: () => AdminHTTPClient.invitations(),
  });
}

export function useOrganizers() {
  return useQuery({
    queryKey: ["admin", "organizers"],
    queryFn: () => AdminHTTPClient.organizers(),
    staleTime: 60_000,
  });
}

/** Every admin write. Each one invalidates the admin caches it can affect. */
export function useAdminActions(userId?: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    if (userId)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.admin.person(userId),
      });
  };
  const id = () => userId as string;

  return {
    updateUser: useMutation({
      mutationFn: (body: UpdateUserInput) =>
        AdminHTTPClient.updateUser(id(), body),
      onSuccess: invalidate,
    }),
    recordClearance: useMutation({
      mutationFn: (body: ClearanceBody) =>
        AdminHTTPClient.recordClearance(id(), body),
      onSuccess: invalidate,
    }),
    forceSignout: useMutation({
      mutationFn: () => AdminHTTPClient.forceSignout(id()),
      onSuccess: invalidate,
    }),
    invite: useMutation({
      mutationFn: (body: InviteInput) => AdminHTTPClient.invite(body),
      onSuccess: invalidate,
    }),
    adjustHours: useMutation({
      mutationFn: (body: AdjustHoursInput) => AdminHTTPClient.adjustHours(body),
      onSuccess: invalidate,
    }),
    revokeCertificate: useMutation({
      mutationFn: ({
        certificateId,
        reason,
      }: {
        certificateId: string;
        reason: string;
      }) => CertificateHTTPClient.revoke(certificateId, reason),
      onSuccess: invalidate,
    }),
    updateSettings: useMutation({
      mutationFn: (body: SettingsInput) => AdminHTTPClient.updateSettings(body),
      onSuccess: (settings) => {
        queryClient.setQueryData(QUERY_KEYS.settings, settings);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.publicSettings });
      },
    }),
  };
}
