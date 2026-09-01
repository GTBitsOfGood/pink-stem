# Sprint 1 ticket paste sheet

Temporary file. Copy each ticket into a new GitHub issue, then delete this file.
It is untracked, so deleting it leaves nothing behind.

The heading is the issue title, and the fenced block under it is the body.
Shared context for all five is in `docs/sprints/sprint-1.md`, which stays in the repo.

---

## Setup and spike: authentication and role-based access

**Assign to:** Dev 1

```markdown
Sprint context: `docs/sprints/sprint-1.md`

**Estimate:** 3 hrs setup, 6 to 8 hrs spike (timeboxed)

### Description

Get your dev environment running, then work out how we should handle accounts. We need four user types (student, parent, educator, admin) whichever direction the project goes. This is the hardest decision to walk back later, so we want a recommendation before anyone writes an auth flow.

### Acceptance Criteria

- [ ] `nvm use`, `npm install`, and `npm run dev` serves http://localhost:3000
- [ ] You can create, list and delete a note in the demo app
- [ ] `npm run lint`, `typecheck`, `format:check` and `build` all pass locally
- [ ] `docs/ARCHITECTURE.md` read, and you have added yourself to the Team section of the README
- [ ] `docs/spikes/auth.md` compares Auth.js, Clerk and Firebase Auth on cost at 2,000 users, roles and permissions, Google Workspace SSO, and how locked in we would be
- [ ] It says what each option implies for our database choice, since we have not picked one
- [ ] It answers how a parent registering a child is modeled: one account with a guardian link, or two linked accounts. Pick one
- [ ] It covers COPPA and FERPA constraints for under-13 students: what parental consent means for signup, what data to avoid collecting, and whether the provider allows under-13 accounts at all
- [ ] It ends with one recommendation, the reasoning behind it, and a rough plan for building it in sprint 2

### Other Notes

- Don't build anything yet. The implementation is a sprint 2 ticket.
- Route A points toward Google SSO since educators have Workspace accounts, Route B toward email and password since young students often don't. The recommendation needs to work for both.
- Have a look at what other Bits of Good projects use before picking something unusual.
```

---

## Setup and spike: Google Classroom and Google Sites data access

**Assign to:** Dev 2

```markdown
Sprint context: `docs/sprints/sprint-1.md`

**Estimate:** 3 hrs setup, 6 to 8 hrs spike (timeboxed)

### Description

Get your dev environment running, then find out what we can actually do with Google's education stack. Route A depends on whether we can read and write Classroom data, and whether the curriculum in Google Sites can be pulled out. Right now we are guessing at both.

### Acceptance Criteria

- [ ] `nvm use`, `npm install`, and `npm run dev` serves http://localhost:3000
- [ ] You can create, list and delete a note in the demo app
- [ ] `npm run lint`, `typecheck`, `format:check` and `build` all pass locally
- [ ] `docs/ARCHITECTURE.md` read, and you have added yourself to the Team section of the README
- [ ] `docs/spikes/google-classroom.md` lists the endpoints we would use (courses, rosters, coursework, submissions, grades) and the OAuth scopes each needs
- [ ] It answers the two questions that decide whether Route A works: can we write coursework and grades back into a teacher's Classroom, and does a school admin have to approve our app first
- [ ] It says how the Google Sites curriculum could be extracted: an API, an export, or copy and paste by hand
- [ ] Either a throwaway script that authenticates with a personal Google account and lists courses, or a writeup of where you got stuck

### Other Notes

- Use a personal Gmail account. Don't touch a real Pink STEM or school Workspace account, and don't commit tokens.
- Put the script under `docs/spikes/` or link a gist. It doesn't go in `src/`.
- Ask the PM to raise app approval with the nonprofit. If school admins have to approve us, that may settle Route A on its own.
- Since Aviation is the only course we're building, "we can't migrate 50 courses" isn't an argument for staying on Google Sites. Weigh Route A on the Classroom features instead.
```

---

## Setup and spike: Aviation curriculum audit and content model

**Assign to:** Dev 3

```markdown
Sprint context: `docs/sprints/sprint-1.md`

**Estimate:** 3 hrs setup, 6 to 8 hrs spike (timeboxed)

### Description

Get your dev environment running, then audit the Aviation course. It is the only one we are building right now, and it is currently spread across Google Sites, Excel, Canva and PowerPoint. Work out what is in it, then propose the data model we would store it in.

### Acceptance Criteria

- [ ] `nvm use`, `npm install`, and `npm run dev` serves http://localhost:3000
- [ ] You can create, list and delete a note in the demo app
- [ ] `npm run lint`, `typecheck`, `format:check` and `build` all pass locally
- [ ] `docs/ARCHITECTURE.md` read, and you have added yourself to the Team section of the README
- [ ] `docs/spikes/content-model.md` has a lesson by lesson inventory of Aviation: name, source format, rough length, grade level, and what kind of content it is
- [ ] It proposes a `Course > Module > Lesson > ContentBlock` model as TypeScript interfaces, where every block type maps to something that actually appears in Aviation
- [ ] It picks how lesson bodies are stored (JSON blocks, Markdown or HTML) and says why
- [ ] It recommends who authors content going forward: a staff member in an admin UI we build, a CMS, or they keep using Google and we import
- [ ] One Aviation lesson is converted by hand into the model and committed as a fixture under `docs/spikes/`, with a note on how long it took

### Other Notes

- Ask the PM for the Aviation source files first. It connects to the Air and Space STEM Outreach work and GT Aerospace, so ask what belongs to the course and what doesn't.
- Design something the nonprofit can maintain without us. We hand this off in May.
- Don't over-model it. Handle Aviation cleanly with one escape hatch block type rather than building for courses we haven't seen.
- We have no database yet, so write plain TypeScript interfaces. If the model makes a particular kind of database an obvious fit, say so.
```

---

## Setup and spike: gamification mechanics

**Assign to:** Dev 4

```markdown
Sprint context: `docs/sprints/sprint-1.md`

**Estimate:** 3 hrs setup, 6 to 8 hrs spike (timeboxed)

### Description

Get your dev environment running, then research how other platforms handle gamification and propose a system for Pink STEM. The nonprofit has been specific about wanting scenario-based challenges where students earn points for problem solving, which teachers can use toward grades. This stays in scope whichever direction we take.

### Acceptance Criteria

- [ ] `nvm use`, `npm install`, and `npm run dev` serves http://localhost:3000
- [ ] You can create, list and delete a note in the demo app
- [ ] `npm run lint`, `typecheck`, `format:check` and `build` all pass locally
- [ ] `docs/ARCHITECTURE.md` read, and you have added yourself to the Team section of the README
- [ ] `docs/spikes/gamification.md` breaks down at least three comparable products: the core loop, the unit of reward, and what makes it work for K-12
- [ ] It recommends three or four mechanics and says which ones you are leaving out and why
- [ ] It takes a position on public leaderboards, given that this program is aimed at girls already underrepresented in STEM
- [ ] It has a data model as TypeScript interfaces for awards, badge definitions, badge grants and student progress, with awards as an append-only ledger rather than a counter on the user
- [ ] It says what triggers an award and which triggers we can actually detect on each route
- [ ] Two or three rough sketches of the student progress screen, hand drawn is fine

### Other Notes

- The nonprofit's community launches this fall on Omniverse City. Ask whether points earned there need to appear in our platform, and tell Dev 5 if they do.
- The branding is space themed and the course is Aviation, so missions or flights fit better than a generic XP bar. Ground one example in a real Aviation lesson.
- The designer is working on visual direction the same week, so sync with them on the sketches.
- Keep it contained. A points and badges system we ship beats a reward economy we design and never build.
```

---

## Setup and spike: partner integrations

**Assign to:** Dev 5

```markdown
Sprint context: `docs/sprints/sprint-1.md`

**Estimate:** 3 hrs setup, 5 to 7 hrs spike (timeboxed)

### Description

Get your dev environment running, then find out what our three partner systems actually offer. Each of VolunTrack, Omniverse City and Augusta University will turn out to be a real API integration, an account link, or just a link to their site. We are estimating all three as full integrations, which is probably wrong for at least one.

### Acceptance Criteria

- [ ] `nvm use`, `npm install`, and `npm run dev` serves http://localhost:3000
- [ ] You can create, list and delete a note in the demo app
- [ ] `npm run lint`, `typecheck`, `format:check` and `build` all pass locally
- [ ] `docs/ARCHITECTURE.md` read, and you have added yourself to the Team section of the README
- [ ] `docs/spikes/integrations.md` has a section per partner covering what the product is, how people use it today, and whether there is an API, an export, or account linking
- [ ] Each section ends with a verdict: API integration, account linking, link out only, or unknown pending an answer from the nonprofit, plus a rough effort estimate
- [ ] It has a list of questions for the PM, written so someone non-technical can ask them as written
- [ ] It says whether any of the three could ship as a simple partners page in sprint 2

### Other Notes

- At least one of these is probably a link out. Finding that out now stops us carrying scope for work that doesn't exist.
- Don't sign up for vendor trials or contact partners directly. Outreach goes through the PM.
- Check with Dev 4 on whether Omniverse City points need to flow into our progress system. If they do, it becomes a real integration.
```
