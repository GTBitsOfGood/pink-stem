import { jwtVerify, SignJWT } from "jose";
import type { NextResponse } from "next/server";
import { SESSION_DAYS } from "@/constants/limits";
import type { SessionClaims } from "@/types/auth";
import type { Role } from "@/types/user";

export const SESSION_COOKIE = "session";

/** Edge-safe: used by both `proxy.ts` and route handlers. */
const secret = () => {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error("Please define the JWT_SECRET environment variable");
  }
  return new TextEncoder().encode(value);
};

export async function signSession(
  userId: string,
  role: Role,
  sessionVersion: number
): Promise<string> {
  return new SignJWT({ role, sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

/** Returns the claims, or null for a missing, malformed, or expired token. */
export async function verifySession(
  token: string | undefined
): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(expires = true) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: expires ? SESSION_DAYS * 24 * 60 * 60 : 0,
  };
}

export function attachSession(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}

export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(false));
  return response;
}
