"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
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

const NAV: NavItem[] = [
  { href: "/events", label: "Events" },
  {
    href: "/dashboard",
    label: "My shifts",
    roles: ["volunteer", "organizer", "admin"],
  },
  {
    href: "/hours",
    label: "Hours",
    roles: ["volunteer", "organizer", "admin"],
  },
  {
    href: "/messages",
    label: "Messages",
    roles: ["volunteer", "organizer", "admin"],
  },
  { href: "/organizer", label: "Organize", roles: ["organizer", "admin"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
];

export default function SiteHeader() {
  const { me, user, isLoading, logout } = useSession();
  const pathname = usePathname();
  // The menu remembers which page opened it, so navigating closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  const items = NAV.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const unread = me?.unreadMessages ?? 0;

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
          {item.href === "/messages" && unread > 0 ? (
            <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
              {unread}
            </span>
          ) : null}
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
              <Link
                href="/profile"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100"
              >
                {user.firstName}
              </Link>
              <button
                type="button"
                onClick={logout}
                className={buttonClasses("ghost", "sm")}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
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
            <div className="mt-2 flex gap-2 border-t border-ink-100 pt-3">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className={buttonClasses("secondary", "md", "flex-1")}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className={buttonClasses("ghost", "md")}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
