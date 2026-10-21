# Sprint 4

Seven tickets. Five come from the design review, one from Pink STEM's waiver,
and one takes out long-term programs. The tickets are GitHub issues #39 through
#44 and #47, and this file is the shared context, so read it before starting
yours.

## What we heard from design

Molly and Hannah, our designers, went through the Hub as a volunteer, an
organizer and an admin. Their main points:

- **The Hub feels like a second Pink STEM website.** pinkstem.org already
  explains what Pink STEM does, so the Hub should just be for volunteers. Both
  suggested dropping the home page and landing on the events list.
- **The events page has too many names.** The tab says "Events", buttons say
  "Find a shift" and the footer says "Browse events". Admins also see "Organize"
  for their list of events.
- **The admin's profile link says "Pink STEM".** The header shows your first
  name, and the seeded admin's first name is "Pink STEM".
- **Admins can still see the home page,** which is written for new volunteers.
- **Messages feels out of place.** It's a nav tab next to pages that aren't like
  it, and it doesn't look like messaging. Hannah suggested an icon in the top
  right with an unread indicator in place of sign out, and moving sign out to
  the profile page.
- **The "Verify a certificate" banner was confusing.** Hannah thought it was
  something volunteers had to do and suggested a "Get verified" button.
- **It looks vibe-coded.** Everything works, but it doesn't look designed.

## Answers to their questions

Pass these back to Molly and Hannah.

- **Is the Hub replacing pinkstem.org?** No, it works alongside it. Dr. Head is
  still deciding between a separate domain and embedding the Hub in the current
  site. Either way, pinkstem.org explains Pink STEM and sends volunteers here.
- **Is Messages notifications or email?** Neither. It's one to one messaging
  between a volunteer and the organizer of an event they're on, with one thread
  per volunteer per event. Each new message is also emailed, at most once per
  thread per hour. It's real messaging, so it should look like it.
- **Does Messages show new replies?** Yes. The tab shows an unread count, but
  only when something's unread, so it's easy to miss in a demo. It also doesn't
  update while you're sitting on a page. The header ticket fixes both.
- **What is certificate verification?** It's for schools and employers. They
  enter the code or scan the QR code on a volunteer's certificate and see the
  name, hours and whether it's still valid. They don't need an account, don't
  get a PDF, and can check as often as they want. Volunteers don't do anything
  here. They get a PDF certificate automatically once an organizer approves
  their hours, and can make a service record for any date range from Hours. None
  of it is needed to sign up for shifts, and it has nothing to do with
  background checks. A "Get verified" button would sound like the background
  check, so we're leaving it out.

## The waiver

Pink STEM needs every volunteer to sign their liability waiver, a JotForm, each
time they sign up for an event. Parents sign the same form for anyone under 18,
so we don't need our own guardian step. It replaces both the click-through
waiver we wrote and the guardian consent email.

We can't see JotForm submissions without access to Pink STEM's account, so
volunteers confirm they've signed it.

## One kind of volunteer

We're keeping the mentorship program, the weekly long-term classes, separate
from the Hub. This semester is about finishing and deploying the volunteer
system. So there's one kind of volunteer again, who signs up for published
events, and the long-term programs from sprint 3 come out.

## Names we're using

Use these labels everywhere. If a ticket disagrees, the table wins.

| What                           | Today                                                           | Sprint 4              |
| ------------------------------ | --------------------------------------------------------------- | --------------------- |
| `/events` tab and page title   | Events                                                          | Event shifts          |
| Buttons and links to `/events` | Find a shift, Find another shift, Browse events, See all events | Browse event shifts   |
| `/organizer` for admins        | Organize                                                        | Events                |
| `/organizer` for organizers    | Organize                                                        | My events             |
| Profile link in the header     | The user's first name                                           | Profile               |
| Messages                       | A nav tab                                                       | An icon in the header |

Organizers get "My events" because they also see "Event shifts", and two tabs
with nearly the same name is the problem we're fixing. URLs don't change.

## Things to know before you start

- **Admins don't participate.** They don't get the messages icon. `src/proxy.ts`
  already keeps them out of `/dashboard`, `/hours` and `/messages`, and their
  nav has no Event shifts tab.
- **`SiteHeader.tsx` is shared.** The naming ticket changes nav labels, and the
  header ticket changes the right side and drops Messages from the nav. Whoever
  merges second rebases. It's a small conflict.
- **So is the profile page.** The header ticket adds Sign out, and the waiver
  ticket removes the waiver and guardian sections.
- **The organizer event pages are shared too.** #40 relabels their back links,
  and #47 removes the long-term options from them.
- **The polish pass goes last.** It touches almost every page, so start building
  once the home page, naming and header tickets land.
- **Don't add explanatory copy.** A big part of why it looks generated is that
  every page explains its own rules. If a screen really needs a sentence, keep
  it to one.
- **Design reviews happen on staging.** Deploy previews use the staging
  database, so Molly and Hannah can click through a PR with the demo accounts
  without running anything.

**Definition of done** is the same as sprint 3: a PR against `main`, CI green,
one approval, and a PR description with what you ran and a preview link. Every
ticket this sprint changes the UI, so add before and after screenshots too. If
you find something real that's out of scope, open an issue instead of adding it
to your PR.

## Tickets

| Ticket                                                       | Size   | Lands in                                                                  |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------- |
| #39 Remove the home page and land on Event shifts            | Light  | `src/proxy.ts`, `src/app/page.tsx`, `SiteFooter.tsx`                      |
| #40 Use one name for event shifts and rename Organize        | Light  | `SiteHeader.tsx`, `src/app/events/`, `src/app/organizer/`                 |
| #41 Header: Profile link, messages icon, sign out on profile | Medium | `SiteHeader.tsx`, `useSession.ts`, `src/app/profile/`                     |
| #42 Make Messages look like an inbox                         | Large  | `src/app/messages/`, `src/components/messages/`                           |
| #43 Design polish pass                                       | Large  | `Primitives.tsx`, `globals.css`, page copy across `src/app/`              |
| #44 Sign Pink STEM's waiver for every event                  | Large  | `ShiftList.tsx`, `src/services/signup.ts`, guardian consent across `src/` |
| #47 Remove long-term programs                                | Medium | `EventForm.tsx`, `src/services/event.ts`, `src/app/organizer/events/`     |

There are no pairs. Sai has #43 and #47, and everyone else has one ticket.

## Not this sprint

- **A notification center.** Event updates, waitlist moves and absence reports
  would fit, but we don't track read state for any of them. That's why the
  header icon is just messages and not a bell. It's in the backlog as #45.
- **An event field on the waiver.** The JotForm doesn't say which event a waiver
  is for. It's Pink STEM's form, so the PM will bring it up with them.
- **Changes to pinkstem.org.** Their volunteer link should point to the Hub.
  It's their site, so the PM will bring that up too.
- **A new visual identity.** The polish pass only removes and tightens. No new
  colors, fonts or component library unless design gives us one.
- **Renaming routes.** `/events` and `/organizer` keep their URLs.
