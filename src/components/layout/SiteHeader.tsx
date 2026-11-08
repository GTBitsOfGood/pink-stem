"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, MessageSquare, X } from "lucide-react";
import Container from "@/components/layout/Container";
import { useSession } from "@/components/hooks/useSession";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/user";

interface NavItem {
  href: string;
  label: string;
  roles?: Role[];
}

/** Everyone else participates, so their nav is the participant items plus My events for organizers. */
const NAV: NavItem[] = [
  { href: "/dashboard", label: "My shifts", roles: ["volunteer", "organizer"] },
  { href: "/events", label: "Browse Events" },
  { href: "/hours", label: "Hours", roles: ["volunteer", "organizer"] },
  { href: "/organizer", label: "My events", roles: ["organizer"] },
];

/** Admins administer, so their nav is the console's five sections and nothing else. */
const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Approvals" },
  { href: "/admin/people", label: "People" },
  { href: "/organizer", label: "Events" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export default function SiteHeader() {
  const { me, user, isLoading } = useSession();
  const pathname = usePathname();
  // The menu remembers which page opened it, so navigating closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  const items =
    user?.role === "admin"
      ? ADMIN_NAV
      : NAV.filter(
          (item) => !item.roles || (user && item.roles.includes(user.role))
        );
  // Approvals is the console root, so only an exact match lights it up.
  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
  const unread = me?.unreadMessages ?? 0;
  const messagesLabel = unread ? `Messages, ${unread} unread` : "Messages";
  // The link's label carries the real count, so the badge is not announced.
  const badge = (className?: string) =>
    unread ? (
      <span
        aria-hidden
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white",
          className
        )}
      >
        {unread > 9 ? "9+" : unread}
      </span>
    ) : null;
  const hasInbox = user?.role === "volunteer" || user?.role === "organizer";

  const links = (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
            isActive(item.href)
              ? "bg-brand-50 text-brand-800"
              : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
          )}
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="Pink STEM Volunteer Hub home"
        >
          <Image
            src="/brand/pinkstem-logo.png"
            alt="Pink STEM"
            width={150}
            height={29}
            priority
            className="h-7 w-auto"
          />
          <span className="hidden border-l border-ink-200 pl-3 text-[13px] font-bold uppercase tracking-[0.12em] text-ink-500 sm:inline">
            Volunteer Hub
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isLoading ? null : user ? (
            <>
              {hasInbox ? (
                <Link
                  href="/messages"
                  aria-label={messagesLabel}
                  className={cn(
                    "relative inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    isActive("/messages")
                      ? "bg-brand-50 text-brand-800"
                      : "text-ink-700 hover:bg-ink-100"
                  )}
                >
                  <MessageSquare className="h-4 w-4" aria-hidden />
                  {badge("absolute -right-1.5 -top-1.5")}
                </Link>
              ) : null}
              <Link
                href="/profile"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100"
              >
                Profile
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClasses("ghost", "sm")}>
                Sign in
              </Link>
              <Link href="/register" className={buttonClasses("primary", "sm")}>
                Become a volunteer
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpenFor(open ? null : pathname)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {open ? (
        <div className="border-t border-ink-100 bg-white md:hidden">
          <Container className="grid gap-1 py-3">
            {links}
            {user ? (
              <div className="mt-2 grid gap-1 border-t border-ink-100 pt-3">
                {hasInbox ? (
                  <Link
                    href="/messages"
                    aria-label={messagesLabel}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      isActive("/messages")
                        ? "bg-brand-50 text-brand-800"
                        : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden />
                    <span>Messages</span>
                    {badge()}
                  </Link>
                ) : null}
                <Link
                  href="/profile"
                  className={buttonClasses("secondary", "md", "w-full")}
                >
                  Profile
                </Link>
              </div>
            ) : (
              <div className="mt-2 flex gap-2 border-t border-ink-100 pt-3">
                <Link
                  href="/login"
                  className={buttonClasses("secondary", "md", "flex-1")}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className={buttonClasses("primary", "md", "flex-1")}
                >
                  Become a volunteer
                </Link>
              </div>
            )}
          </Container>
        </div>
      ) : null}
    </header>
  );
}
