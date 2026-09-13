import type { Role } from "@/types/user";

/** Claims carried in the session cookie. */
export interface SessionClaims {
  sub: string;
  role: Role;
  /** Session version; must match the user's current value. */
  sv: number;
  iat: number;
  exp: number;
}

/** The authenticated caller, as services see it. */
export interface Actor {
  id: string;
  role: Role;
  email: string;
  name: string;
  ip?: string;
}
