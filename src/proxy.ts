import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import type { Role } from "@/types/user";

/**
 * Page-level access. API routes enforce authorization on every request via
 * `withAuth`; this only keeps signed-out or under-privileged visitors from
 * landing on a screen they cannot use.
 */
const PROTECTED: { prefix: string; roles?: Role[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/organizer", roles: ["organizer", "admin"] },
  { prefix: "/dashboard" },
  { prefix: "/hours" },
  { prefix: "/messages" },
  { prefix: "/profile" },
];

const SIGNED_OUT_ONLY = ["/login", "/register"];

/**
 * Admins do not volunteer, so these send them to the console. A single
 * thread stays reachable, since that is where a reported message is
 * reviewed, and so does the list scoped to one event by `eventId`, since an
 * admin who runs an event still answers its volunteers.
 */
const PARTICIPANT_ONLY = ["/dashboard", "/hours", "/messages"];

const home = (role: Role) => (role === "admin" ? "/admin" : "/dashboard");

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const claims = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (claims && SIGNED_OUT_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL(home(claims.role), req.url));
  }

  if (
    claims?.role === "admin" &&
    PARTICIPANT_ONLY.includes(pathname) &&
    !(pathname === "/messages" && req.nextUrl.searchParams.has("eventId"))
  ) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  const rule = PROTECTED.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );
  if (!rule) return NextResponse.next();

  if (!claims) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (rule.roles && !rule.roles.includes(claims.role)) {
    return NextResponse.redirect(new URL(home(claims.role), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|brand|icon.png|favicon.ico).*)"],
};
