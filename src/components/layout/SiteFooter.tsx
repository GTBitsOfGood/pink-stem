"use client";

import Link from "next/link";
import { usePublicSettings } from "@/components/hooks/useProfile";
import Container from "@/components/layout/Container";
import { DEFAULT_ORG_SETTINGS } from "@/constants/org";

export default function SiteFooter() {
  const org = usePublicSettings().data ?? DEFAULT_ORG_SETTINGS;
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <Container className="grid gap-8 py-10 text-sm text-ink-600 md:grid-cols-3">
        <div>
          <p className="text-base font-bold text-ink-900">{org.orgName}</p>
          <p className="mt-1 max-w-xs">
            Breaking barriers for girls in STEM. A 501(c)(3) nonprofit serving
            Metro Atlanta and Middle Georgia.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-2">Contact</p>
          <p>{org.addressLine1}</p>
          <p>{org.addressLine2}</p>
          <p className="mt-1">{org.phone}</p>
          <a
            href={`mailto:${org.email}`}
            className="text-brand-700 hover:underline"
          >
            {org.email}
          </a>
        </div>
        <div>
          <p className="eyebrow mb-2">Links</p>
          <ul className="grid gap-1">
            <li>
              <Link href="/events" className="hover:text-brand-700">
                Browse events
              </Link>
            </li>
            <li>
              <Link href="/verify" className="hover:text-brand-700">
                Verify a certificate
              </Link>
            </li>
            <li>
              <a
                href={org.website}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand-700"
              >
                {org.website.replace(/^https?:\/\//, "")}
              </a>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-ink-100 py-4 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} {org.orgName} Built with Bits of Good.
      </div>
    </footer>
  );
}
