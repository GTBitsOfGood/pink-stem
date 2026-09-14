"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ShieldCheck,
} from "lucide-react";
import EventCard from "@/components/events/EventCard";
import { useEventList } from "@/components/hooks/useEvents";
import { useSession } from "@/components/hooks/useSession";
import Container from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Primitives";

const STEPS = [
  {
    icon: <CalendarCheck className="h-6 w-6" />,
    title: "Claim a shift",
    body: "Browse camps, robotics workshops, cybersecurity bootcamps, and expos across Metro Atlanta and Middle Georgia. Sign up for the hours you can give, not the whole day.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: "Get cleared",
    body: "Because our programs serve girls aged 12 and up, every volunteer is screened before working with students. Your spot is held while staff record the outcome.",
  },
  {
    icon: <BadgeCheck className="h-6 w-6" />,
    title: "Earn verified hours",
    body: "Organizers approve attendance on the day. Hours post to your ledger and a certificate with a public verification code is issued automatically.",
  },
];

export default function HomePage() {
  const { user } = useSession();
  const events = useEventList({ hasSpots: "true" });
  const featured = events.data?.items.slice(0, 3) ?? [];

  return (
    <>
      <section className="border-b border-ink-200 bg-white">
        <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="eyebrow">Pink STEM Volunteer Hub</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              Show a girl what she can build.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-600">
              Pink STEM&apos;s camps, coaching, and career days run on volunteer
              mentors: engineers, nurses, coders, pilots, and students earning
              service hours. Find a shift that fits your Saturday, and leave
              with hours a school or employer can verify.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink
                href="/events"
                size="lg"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Find a shift
              </ButtonLink>
              {!user ? (
                <ButtonLink href="/register" size="lg" variant="secondary">
                  Create a volunteer account
                </ButtonLink>
              ) : (
                <ButtonLink href="/dashboard" size="lg" variant="secondary">
                  My shifts
                </ButtonLink>
              )}
            </div>
            <p className="mt-6 text-sm text-ink-500">
              Pink STEM, Inc. is a 501(c)(3) nonprofit in Atlanta, Georgia.{" "}
              <a
                href="https://pinkstem.org"
                className="font-semibold text-brand-700 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Learn about our programs
              </a>
            </p>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-brand-50 p-8">
            <div
              className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-200/60"
              aria-hidden
            />
            <div
              className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-brand-100"
              aria-hidden
            />
            <dl className="relative grid gap-6">
              {[
                ["Every girl", "has the right to be at the table."],
                [
                  "Metro Atlanta & Middle Georgia",
                  "in-person and virtual programs, year round.",
                ],
                [
                  "Verified service hours",
                  "certificates any third party can check in seconds.",
                ],
              ].map(([term, detail]) => (
                <div key={term}>
                  <dt className="text-lg font-extrabold text-brand-800">
                    {term}
                  </dt>
                  <dd className="text-sm text-ink-700">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-14">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">
            Three steps, one accurate record
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    {step.icon}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="border-t border-ink-200 bg-white">
        <Container className="py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Coming up</p>
              <h2 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">
                Shifts with open spots
              </h2>
            </div>
            <Link
              href="/events"
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              See all events →
            </Link>
          </div>
          <div className="mt-8">
            {events.isPending ? (
              <Spinner label="Loading events" />
            ) : featured.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {featured.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">
                No open shifts right now. New events are posted regularly, so
                check back soon.
              </p>
            )}
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-14">
          <div className="grid gap-6 rounded-3xl bg-ink-900 p-8 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-300">
                For schools and employers
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Verify a certificate in seconds
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-200">
                Every Pink STEM certificate and service record carries a random
                verification code and QR code. Check it here without contacting
                our office.
              </p>
            </div>
            <ButtonLink href="/verify" variant="secondary" size="lg">
              Verify a certificate
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
