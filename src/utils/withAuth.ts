import { NextRequest, NextResponse } from "next/server";
import UserDAO from "@/db/actions/user";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "@/lib/session";
import { SESSION_RENEW_AFTER_HOURS } from "@/constants/limits";
import type { Actor } from "@/types/auth";
import { ForbiddenError, UnauthorizedError } from "@/types/exceptions";
import type { Role } from "@/types/user";
import { handleError } from "@/utils/errorHandler";
import ERRORS from "@/utils/errorMessages";

type Context<T> = { params: T };

type AuthedHandler<T, A> = (
  req: NextRequest,
  context: Context<T>,
  actor: A
) => Promise<NextResponse>;

type WrappedHandler<T> = (
  req: NextRequest,
  context: { params: Promise<T> }
) => Promise<NextResponse>;

interface AuthOptions {
  roles?: Role[];
}

/** Best-effort client address for audit rows and rate limits. */
export const clientIp = (req: NextRequest) =>
  req.headers.get("x-nf-client-connection-ip") ??
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
  "unknown";

interface Resolved {
  actor: Actor | null;
  /** Set when the token is old enough to deserve a fresh cookie. */
  renew?: { userId: string; role: Role; sessionVersion: number };
}

/**
 * Turns the session cookie into an Actor, verifying on every request that
 * the account still exists, is active, and has not been force signed-out.
 */
async function resolveActor(req: NextRequest): Promise<Resolved> {
  const claims = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!claims) return { actor: null };

  const user = await UserDAO.findAuthById(claims.sub);
  if (!user || user.status !== "active" || user.sessionVersion !== claims.sv) {
    throw new UnauthorizedError(ERRORS.AUTH.SESSION_REQUIRED);
  }

  const actor: Actor = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    ip: clientIp(req),
  };

  const ageHours = (Date.now() / 1000 - claims.iat) / 3600;
  const renew =
    ageHours > SESSION_RENEW_AFTER_HOURS
      ? {
          userId: actor.id,
          role: user.role,
          sessionVersion: user.sessionVersion,
        }
      : undefined;

  return { actor, renew };
}

function wrap<T, A extends Actor | null>(
  handler: AuthedHandler<T, A>,
  options: AuthOptions & { optional: boolean }
): WrappedHandler<T> {
  return async (req, context) => {
    try {
      const params = await context.params;
      const { actor, renew } = await resolveActor(req);

      if (!actor && !options.optional) {
        throw new UnauthorizedError(ERRORS.AUTH.SESSION_REQUIRED);
      }
      if (actor && options.roles && !options.roles.includes(actor.role)) {
        throw new ForbiddenError(ERRORS.AUTH.FORBIDDEN);
      }

      const response = await handler(req, { params }, actor as A);

      // Sessions expire after 30 days of inactivity, so activity slides them.
      if (renew) {
        const token = await signSession(
          renew.userId,
          renew.role,
          renew.sessionVersion
        );
        response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
      }
      return response;
    } catch (error) {
      const response = handleError(error);
      // A rejected session cookie is useless; clear it so the client stops sending it.
      if (
        error instanceof UnauthorizedError &&
        req.cookies.has(SESSION_COOKIE)
      ) {
        response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(false));
      }
      return response;
    }
  };
}

/** Requires a signed-in, active user, optionally restricted to given roles. */
export function withAuth<T = Record<string, never>>(
  handler: AuthedHandler<T, Actor>,
  options: AuthOptions = {}
): WrappedHandler<T> {
  return wrap<T, Actor>(handler, { ...options, optional: false });
}

/** Public routes whose response changes when a user happens to be signed in. */
export function withOptionalAuth<T = Record<string, never>>(
  handler: AuthedHandler<T, Actor | null>
): WrappedHandler<T> {
  return wrap<T, Actor | null>(handler, { optional: true });
}
