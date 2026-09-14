# Pink STEM Partner Integrations

## Purpose

Pink STEM's new platform needs to connect to three outside systems: our own volunteer-management tool (VolunTrack), a game-based learning community (Omniverse City), and Augusta University's certification programs. This doc lays out what each one is, how people actually use it, and what kind of technical connection is realistically possible, based on what's publicly documented plus what we've been told directly.

---

## 1. **VolunTrack — Volunteer & Event Management**

**What it is:**

VolunTrack is a volunteer/event management platform originally built by Bits of Good for a different partner (Helping Mamas), but it's since grown into a general-purpose tool that any Bits of Good nonprofit partner can get their own instance of. It's built in-house — React/Next.js frontend and API routes, MongoDB for storage, MailerSend for transactional emails, deployed via Netlify. Core features:

- Account creation for both volunteers and admins
- Admins create events with a date, description, and location
- Volunteers can register, check in/out, and sign required waivers through the platform
- A dashboard aggregates participation data — admins see it across all volunteers, individual volunteers see their own stats

Other nonprofits have gotten their own VolunTrack instance before — e.g. AARF (animal rescue) had a volunteer management site built off this same VolunTrack initiative.

**How Pink STEM aims to use it:**

I think we pitched to Pink STEM that we could make them an instance for use, not too sure if one already exists or not.

**Integration:**

Bits of Good wrote and owns this codebase and database, so there's no third-party black box to work around:

- Since it's a Next.js app, the existing `/pages/api` routes could likely be extended fairly easily to expose whatever data our application needs (event lists, registration counts, participation stats).
- Because we control the MongoDB instance, direct database access/queries are also technically possible if a full API layer isn't worth building.
- Being open-source also means we could fork or embed pieces of it directly into our application if that's simpler than building a live integration.

**Open questions:**

- Does Pink STEM currently have a live VolunTrack instance, or is this a proposed/future use?
- How much of an integration do we want?
  - Account Linking?
  - Volunteer Analytics?
  - Allow for Volunteers to register through our application?
- There are lots of VolunTrack instances within our GitHub Space — Which one is the most up to date?

**Recommendation:**

Integrate by building read-only routes into VolunTrack's data — no need to reinvent event creation or registration, since VolunTrack already handles that well. Concretely:

- **For admins/event organizers:** surface volunteer sign-up counts and event status directly in our application
- **For volunteers:** surface available volunteer opportunities so they're visible without leaving our app

For the actual _creation_ of events and _registration_ for them, simple account linking — sending users to VolunTrack to complete those actions — is enough. No write endpoints needed.

**Effort Estimate:**

1 Sprint

---

## 2. Omniverse City — Interactive Learning & Gaming

**What it is:**

Omniverse City is an open world community platform (think GTA, Roblox, Minecraft, etc) built around live events occurring in the world. It allows users (depending on payment tier) to attend live events, complete quests, learn skills, build businesses, and create their own custom domains/worlds. The world can also be hosted through Fortnite servers for a better experience

**How Pink STEM aims to use it:**

Pink STEM has created their own community within Fortnite through Omniverse City that allows students to complete challenges, explore, learn, and eventually make their own games within this system.

**API / export / account linking:**

- It seems that owners of events/domains are able to see some analytics including number of registrations, attendance, participation, and contributions as seen here. However, no public developer/API documentation appears so may require more research

**Open questions (worth sending back to the partner):**

- Clarification on how Pink STEM uses Omniverse City.
  - Do they have their own domain/world that they have created?
  - Do they create their own events within Omniverse City for their students to attend?
- Does Pink STEM have any analytics for [this event](https://luma.com/alhp4wic) that happened on March 20th, 2026?
  - If so, what analytics did they get, and how did they receive it?
  - Could we somehow utilize these analytics?

**Recommendation:**

- Based on information right now, I believe the best we can do is create a simple partners page to Pink STEM’s Omniverse domain/event.
- If they use Omniverse City Events we could create a way for them to enter these events into the application, showing their students when they take place and linking to those specific events for registration and further information.

**Effort Estimate:**

1/2 Sprint

---

## Augusta University (ed2go) — Professional Certification Access

**What it is:**

Augusta University's [Professional Training & Programs](https://www.augusta.edu/pace/professional.php) page isn't actually a tool Augusta built — it's a white-labeled storefront for ed2go, a third-party continuing-education platform (owned by Cengage) used by 2,300+ colleges nationwide. The actual course catalog lives at pace.augusta.edu, which is really just ed2go's national catalog with Augusta's branding on top

The catalog covers 14 categories total, but the ones that actually matter for Pink STEM are:

- **Computer Science** (19 programs) — Data Science & AI, Python for AI (Flask/OpenAI), AI-Focused Software Engineering Boot Camp, Full Stack Developer, Certified Java Developer — full list at ed2go.com/courses/computer-science
- **Artificial Intelligence** (4 programs) — e.g. Introduction to Artificial Intelligence, AI & Machine Learning Suite
- **Information Technology** (54 programs) — various IT cert-prep tracks
- **Computer Applications** (32 programs) — Microsoft/QuickBooks-style certs
- **Teacher Professional Development** (8 programs) — aimed at educators, not students

Courses come in three formats: quick self-paced tutorials, 6-week instructor-led courses, and longer Advanced Career Training Programs (6–18 months, often tied to a real certification exam).

**How Pink STEM aims to use it:**

Not confirmed yet — and there's a catch worth flagging: other ed2go partner sites (e.g. UT's version of this same catalog) state enrollment is open to "anyone age 18 and older." If Pink STEM's students are K-12, this access is probably meant for staff/teacher development, not direct student use.

**API / export / account linking:**

The real integration target is ed2go itself, not Augusta. ed2go publishes a Partner API (SOAP/XML) — full details in their [Partner API 4.1 Implementation Guide (PDF)](https://partner.ed2go.com/wp-content/uploads/2020/07/2020-05-01-ed2go-partner-api4-1.pdf), also indexed on their [Partner API resource page](https://partner.ed2go.com/partner-api-implementation-guide/). It covers:

- Creating/managing student accounts + single sign-on (SSO) links
- Pulling course/category info
- Creating registrations and tracking status, % complete, pass/fail, completion date

Caveats:

- Access requires an institutional ed2go account + API key — tied to whoever owns the ed2go relationship (Augusta or Pink STEM directly). This isn't something we can self-serve into; ed2go's Become a Partner and Become an Academic Partner pages describe how that relationship gets set up.
- It's SOAP/XML, not a modern REST API — more setup work than usual.
- If we get access, SSO means students/staff could jump straight into their coursework from our app.
- Registration data means we could show live progress ("62% complete") instead of just a link.

**Open questions (worth sending back to the partner):**

- Is this for Pink STEM's staff or their students? If students — are they 18+, or does the age rule block direct enrollment entirely?
- Does Pink STEM have its own ed2go account, or do they go through Augusta's portal? Determines whose API key we'd need.
- Which specific certs does Pink STEM actually care about?
- Would Pink STEM want full SSO/progress tracking, or is a simple "browse and link out" enough?

**Recommendation:**

- If we get access: go for SSO + progress tracking within the application
- If not: fall back to linking out to the relevant course categories (AI, Computer Science, IT), similar Omniverse City plan.

**Effort Estimate:**

2 Sprints
