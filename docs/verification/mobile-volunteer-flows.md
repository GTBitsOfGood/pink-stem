# Mobile volunteer flow verification

Verified November 9, 2026 with Chromium component fixtures at 320 × 568,
390 × 844, and 768 × 1024. The fixtures render the production React components
with synthetic API responses; no production accounts, messages, or sign-ups are
created.

## Results

| Flow                     | Checks                                                                                                | Result                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed-out browsing      | Header, event filters, list/calendar control, event cards, pagination, sign-in and registration links | Pass: controls remain visible and the page has no horizontal overflow at all three widths.                                                        |
| Sign-in                  | Email/password fields, forgot-password link, submit action, validation and error area                 | Pass: labels and actions stay visible at 320 px; browser validation can focus each invalid field.                                                 |
| Event details            | Title, description, logistics, shifts, organizer updates and guest registration prompt                | Pass with known follow-up: content does not clip. Event logistics appear after sign-up content on narrow screens; #73 owns that placement change. |
| Shift sign-up and waiver | Shift action, waiver dialog, required confirmation, cancel/submit actions and pending result          | Pass: the dialog stays inside the viewport, scrolls when needed, and both actions remain reachable.                                               |
| My shifts                | Mobile menu, upcoming/past cards, status, pending reasons, details/calendar/cancel actions            | Pass with known follow-up: the page is reachable, but #69 owns moving My shifts to the first navigation position.                                 |
| Hours                    | Summary cards, ledger overflow, service-record date fields and submit action                          | Pass: the ledger scrolls within its container and the form does not widen the page.                                                               |
| Organizer messaging      | Updates, message entry point, disclosure, textarea, cancel/send actions                               | Pass with known follow-up: the flow is usable; #74 owns placing its entry point directly below organizer updates.                                 |

## Interaction checks

- The mobile menu opens and closes without moving content outside the viewport.
- Filters, list/calendar controls, forms, and dialog actions are reachable by
  keyboard and touch-sized controls.
- Dialog focus stays inside the dialog until it closes. Escape and Cancel close
  without submitting.
- Long event titles, addresses, pending reasons, and organizer updates wrap
  instead of creating page-level horizontal scrolling.
- The Hours ledger uses its own horizontal scrolling at 320 px, preserving the
  page width and all columns.
- Loading, empty, error, and populated states retain a visible heading and next
  action.

## Follow-up boundary

This pass did not reproduce an additional application defect. It confirmed the
three already-filed layout tasks above and did not change their implementation.
Browser chrome and hosting overlays were excluded from the results.

The component fixtures cover layout and client interactions with synthetic
responses. A staging smoke test should still confirm real authentication,
persistence, email delivery, and device-specific browser controls after the
related layout PRs deploy.
