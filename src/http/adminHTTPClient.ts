import fetchHTTPClient, { toQuery } from "@/http/fetchHTTPClient";
import type { ClientEvent } from "@/http/eventHTTPClient";
import type { ClientUser } from "@/http/authHTTPClient";
import type {
  AdminOverview,
  AuditRow,
  Paginated,
  PersonDetail,
  PersonRow,
  Report,
} from "@/types/api";
import type { Doc, Serialized } from "@/types/models";
import type { OrgSettings } from "@/types/settings";
import type { Clearance, Role } from "@/types/user";
import type {
  AdjustHoursInput,
  ClearanceInput,
  InviteInput,
  ReportKind,
  SettingsInput,
  UpdateUserInput,
} from "@/utils/validation/admin";

export type ClientOverview = Serialized<AdminOverview>;
export type ClientPersonRow = Serialized<PersonRow>;
export type ClientPersonDetail = Serialized<PersonDetail>;
export type ClientAuditRow = Serialized<AuditRow>;
export type ClientReport = Serialized<Report>;
export type ClientClearance = Serialized<Doc<Clearance>>;
export type ClearanceBody = Omit<ClearanceInput, "clearedOn" | "expiresOn"> & {
  clearedOn?: string | null;
  expiresOn?: string | null;
};

export interface PendingInvite {
  _id: string;
  email: string;
  role?: Role;
  expiresAt: string;
  createdAt: string;
}

export interface OrganizerOption {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

type Filters = Record<string, string | undefined>;

export default class AdminHTTPClient {
  static overview(): Promise<ClientOverview> {
    return fetchHTTPClient("/admin/overview");
  }

  static people(filters: Filters): Promise<Paginated<ClientPersonRow>> {
    return fetchHTTPClient(`/admin/people${toQuery(filters)}`);
  }

  static person(userId: string): Promise<ClientPersonDetail> {
    return fetchHTTPClient(`/admin/people/${userId}`);
  }

  static updateUser(
    userId: string,
    body: UpdateUserInput
  ): Promise<ClientUser> {
    return fetchHTTPClient(`/admin/people/${userId}`, "PATCH", body);
  }

  static recordClearance(
    userId: string,
    body: ClearanceBody
  ): Promise<ClientClearance> {
    return fetchHTTPClient(`/admin/people/${userId}/clearance`, "PUT", body);
  }

  static forceSignout(userId: string): Promise<void> {
    return fetchHTTPClient(`/admin/people/${userId}/signout`, "POST");
  }

  static invitations(): Promise<PendingInvite[]> {
    return fetchHTTPClient("/admin/invitations");
  }

  static invite(body: InviteInput): Promise<void> {
    return fetchHTTPClient("/admin/invitations", "POST", body);
  }

  static organizers(): Promise<OrganizerOption[]> {
    return fetchHTTPClient("/admin/organizers");
  }

  static events(filters: Filters): Promise<Paginated<ClientEvent>> {
    return fetchHTTPClient(`/admin/events${toQuery(filters)}`);
  }

  static adjustHours(body: AdjustHoursInput): Promise<{ total: number }> {
    return fetchHTTPClient("/admin/hours", "POST", body);
  }

  static audit(filters: Filters): Promise<Paginated<ClientAuditRow>> {
    return fetchHTTPClient(`/admin/audit${toQuery(filters)}`);
  }

  static auditCsvUrl(filters: Filters): string {
    return `/api/v1/admin/audit${toQuery({ ...filters, format: "csv" })}`;
  }

  static report(
    kind: ReportKind,
    from: string,
    to: string
  ): Promise<ClientReport> {
    return fetchHTTPClient(`/admin/reports/${kind}${toQuery({ from, to })}`);
  }

  static reportCsvUrl(kind: ReportKind, from: string, to: string): string {
    return `/api/v1/admin/reports/${kind}${toQuery({ from, to, format: "csv" })}`;
  }

  static settings(): Promise<OrgSettings> {
    return fetchHTTPClient("/admin/settings");
  }

  static updateSettings(body: SettingsInput): Promise<OrgSettings> {
    return fetchHTTPClient("/admin/settings", "PUT", body);
  }
}
