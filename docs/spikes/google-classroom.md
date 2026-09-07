# Google Classroom and Google Sites Integration Spike

##summary

Route A is technically feasible as a **teacher-authorized integration**, with
important boundaries:

- Pink STEM can use the Google Classroom API to list a teacher's courses, read
  course rosters, read coursework, and read student submissions and
  assignment-level grades.
- A teacher can authorize Pink STEM to create coursework in a Google Classroom
  course they teach.
- Pink STEM can write `draftGrade` and `assignedGrade` values back to student
  submissions, but only when the corresponding coursework is associated with
  the same Google Cloud project as Pink STEM's OAuth client. Pink STEM should
  therefore create through the API any coursework for which it must reliably
  perform grade passback.
- The Classroom API does not expose a writable overall course grade. Rubric
  scores can be read but cannot be written through the general Classroom API.
- Every integration requires user OAuth consent. Production use may separately
  require Google OAuth verification. A participating school's Google Workspace
  administrator can also restrict or block third-party application access, so
  administrator approval or allowlisting must be treated as a deployment
  dependency even though it is not mandatory in every domain configuration.
- The supported Google Sites API cannot access modern Google Sites. Google
  Takeout can export modern Sites data, but it is a user/admin archive workflow,
  not a runtime content API. For Aviation, the practical extraction choices are
  a one-time Takeout export followed by cleanup or a controlled manual
  migration.

The recommended Route A boundary is to leave course enrollment, assignments,
submissions, and assignment grades in Google Classroom; let a teacher connect a
specific Classroom course to Pink STEM; and ensure that Pink STEM creates any
assignments that require automated grade passback. Google Sites should be
treated as a curriculum source that requires one-time migration or stable
link-outs, not as a programmatically readable content backend.

## Scope and decision being evaluated

Sprint 1 describes two possible product directions:

- **Route A:** Pink STEM continues using Google Sites, Classroom, and Docs for
  curriculum operations, while the Pink STEM application supplies accounts,
  registration, dashboards, progress tracking, and links or integrations.
- **Route B:** Pink STEM stores and renders curriculum itself, including
  interactive modules and gamification.

This spike evaluates the Google-dependent parts of Route A. It is grounded in
the Aviation course, the only course currently in scope. It does not implement
production authentication or a production Classroom integration.

## Conceptual model

The term "course" has two related meanings in this project:

1. The **Aviation curriculum** is the educational material: lessons, readings,
   slides, videos, activities, and challenges. It may be distributed across
   Google Sites, Docs, Slides, and Classroom.
2. A Google Classroom **`Course` resource** is the operational class container:
   teachers, students, materials, assignments, submissions, and grades.

The relevant Classroom resource hierarchy is:

```text
Course
├── Teachers
├── Students
├── Topics
├── CourseWorkMaterials
└── CourseWork
    └── StudentSubmissions
        ├── submission state
        ├── attachments
        ├── draftGrade
        └── assignedGrade
```

Under Route A, Google Classroom remains the source of truth for its course,
roster, coursework, submission, and grade records. Pink STEM would store the
connection between a Pink STEM program/course and a Google Classroom course,
then use an authorized teacher's Google access to read or update permitted
Classroom resources.

A representative future flow is:

```text
Teacher signs in to Pink STEM
  → teacher connects Google Classroom through OAuth
  → Pink STEM lists courses the teacher can access
  → teacher selects the Aviation Classroom course
  → Pink STEM stores that course's Google ID
  → Pink STEM reads roster/coursework/submissions as needed
  → Pink STEM creates any assignment it must grade automatically
  → Pink STEM writes assignment grades back to associated submissions
```

The current repository does not implement this flow. It is the integration
boundary this spike evaluates.

## Authentication, authorization, and scopes

Google Classroom uses OAuth 2.0 delegated authorization. The application asks
a Google user to approve named permissions called **scopes**. The resulting
access token represents both:

- the user on whose behalf the request is being made; and
- the precise categories of access that user granted.

A scope does not override the user's Classroom permissions. For example, a
write scope does not let a student create coursework in a course where only a
teacher can do so.

Google recommends requesting the narrowest scopes required by implemented
features. The official scope meanings are documented in
[Choose Google Classroom API scopes](https://developers.google.com/workspace/classroom/guides/auth).

### Endpoint and OAuth scope matrix

| Need                                                                 | REST method                                                                            | Minimum relevant scope                                                   | Role and behavior                                                                                                                                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List courses visible to the connected user                           | `GET /v1/courses`                                                                      | `https://www.googleapis.com/auth/classroom.courses.readonly`             | Returns only courses the requesting identity is permitted to view. It can be filtered with `teacherId=me` or `studentId=me`.                                                        |
| Read students in a course                                            | `GET /v1/courses/{courseId}/students`                                                  | `https://www.googleapis.com/auth/classroom.rosters.readonly`             | Returns students the requester may view. Results are paginated.                                                                                                                     |
| Read teachers in a course                                            | `GET /v1/courses/{courseId}/teachers`                                                  | `https://www.googleapis.com/auth/classroom.rosters.readonly`             | Returns teachers the requester may view. Results are paginated.                                                                                                                     |
| Read roster email addresses                                          | The student and teacher endpoints above                                                | `https://www.googleapis.com/auth/classroom.profile.emails`               | Needed when Pink STEM reads `profile.emailAddress`, for example to match Classroom users with Pink STEM accounts.                                                                   |
| Read roster profile photos                                           | The student and teacher endpoints above                                                | `https://www.googleapis.com/auth/classroom.profile.photos`               | Optional; it should not be requested unless the product uses profile photos.                                                                                                        |
| Read coursework as a teacher or administrator                        | `GET /v1/courses/{courseId}/courseWork`                                                | `https://www.googleapis.com/auth/classroom.coursework.students.readonly` | Teachers and domain administrators may read permitted coursework. Students use a `coursework.me` scope and see only published work available to them.                               |
| Create coursework                                                    | `POST /v1/courses/{courseId}/courseWork`                                               | `https://www.googleapis.com/auth/classroom.coursework.students`          | The requesting user must be permitted to create coursework. A course teacher can do so; a student or an administrator who is not a teacher in that course cannot.                   |
| Read submissions and assignment grades as a teacher or administrator | `GET /v1/courses/{courseId}/courseWork/{courseWorkId}/studentSubmissions`              | `https://www.googleapis.com/auth/classroom.coursework.students.readonly` | Teachers and domain administrators may view all permitted submissions; a student may view only their own. `courseWorkId=-` can request submissions across coursework in one course. |
| Set assignment grades                                                | `PATCH /v1/courses/{courseId}/courseWork/{courseWorkId}/studentSubmissions/{id}`       | `https://www.googleapis.com/auth/classroom.coursework.students`          | A course teacher may update `draftGrade` and `assignedGrade`, subject to developer-project association. An `updateMask` is required.                                                |
| Return graded work                                                   | `POST /v1/courses/{courseId}/courseWork/{courseWorkId}/studentSubmissions/{id}:return` | `https://www.googleapis.com/auth/classroom.coursework.students`          | Only a course teacher may return a submission. The API call does not automatically copy `draftGrade` into `assignedGrade`.                                                          |

Primary endpoint references:

- [courses.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses/list)
- [courses.students.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.students/list)
- [courses.teachers.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.teachers/list)
- [courses.courseWork.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork/list)
- [courses.courseWork.create](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork/create)
- [studentSubmissions.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork.studentSubmissions/list)
- [studentSubmissions.patch](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork.studentSubmissions/patch)
- [studentSubmissions.return](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork.studentSubmissions/return)

### Least-privilege scope sets

The proof-of-concept script in this spike only lists courses and therefore asks
for only:

```text
https://www.googleapis.com/auth/classroom.courses.readonly
```

A production read-only roster import would normally require:

```text
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.rosters.readonly
https://www.googleapis.com/auth/classroom.profile.emails
```

Google's
[roster import guide](https://developers.google.com/workspace/classroom/tutorials/import-rosters)
uses this combination because course discovery, roster access, and email access
are separate permissions.

A teacher workflow that creates coursework and writes grades additionally needs:

```text
https://www.googleapis.com/auth/classroom.coursework.students
```

The write scope already permits the corresponding reads. Pink STEM should not
request it from users who only need a read-only dashboard.

## Courses and rosters

### Course discovery

`courses.list` returns courses that the connected Google user is permitted to
view. The application can use `teacherId=me` to find courses the connected user
teaches. Results are ordered by creation time and paginated.

The course ID identifies the specific Google class in later requests. It is not
a credential and does not grant access. Every later request still requires a
valid OAuth token and sufficient user permissions.

### Roster import

For a selected course, Pink STEM can call `students.list` and `teachers.list`.
Both endpoints paginate, so a production synchronization must follow every
`nextPageToken` rather than assuming the first page is complete.

Google identifies people with Google user IDs. Email addresses require the
additional `classroom.profile.emails` scope. If Pink STEM uses email to connect a
Classroom student to a Pink STEM account, it must explicitly request and justify
that access. A more durable implementation should retain Google's user ID as
the external identifier even if email is also used during matching.

Classroom roles are course-specific. A person can be a teacher in one course
and a student in another, so Pink STEM must not infer Classroom authority only
from an application-wide role.

## Coursework and submissions

### Reading coursework

`courseWork.list` reads assignments and other coursework for a course. Students
can see published work available to them. Course teachers and domain
administrators can see all coursework they are authorized to read.

Permission to read a `CourseWork` object does not automatically grant access to
every attached Drive file. Attachments retain their own Drive sharing rules.

### Creating coursework

Pink STEM can create coursework with:

```http
POST https://classroom.googleapis.com/v1/courses/{courseId}/courseWork
```

The request requires `classroom.coursework.students`. The authorized user must
be allowed to create work in the selected course. Google's
[coursework guide](https://developers.google.com/workspace/classroom/guides/manage-coursework)
states that a student, or a domain administrator who is not a teacher in the
course, receives `PERMISSION_DENIED` when attempting to create coursework.

When the API creates a `CourseWork` item, Google associates that item and its
student submissions with the Google Cloud project of the OAuth client used for
the request. The response exposes this relationship through
`associatedWithDeveloper`.

### Reading submissions

`studentSubmissions.list` returns the submissions for one coursework item. The
literal `-` can be used as the coursework ID to list submissions for multiple
coursework items within the course. Teachers and domain administrators may read
all submissions they are permitted to access; a student may only read their own
work.

A `StudentSubmission` may exist before the student has actively submitted
anything. Classroom creates submission records when coursework is assigned.
Its state indicates whether it is created, turned in, returned, or reclaimed.

## Can Pink STEM write coursework and grades back?

### Coursework verdict

**Yes.** Pink STEM can create coursework in a teacher's selected Classroom
course when that teacher authorizes the write scope. Pink STEM should create
through its API integration any assignments for which it needs reliable future
control.

### Grade-passback verdict

**Yes, with a decisive ownership restriction.** Grades are fields on
`StudentSubmission`; there is no separate Grade endpoint. A teacher can update:

- `draftGrade`: a tentative score visible to teachers; and
- `assignedGrade`: the score reported to the student.

The update is:

```http
PATCH /v1/courses/{courseId}/courseWork/{courseWorkId}/studentSubmissions/{id}
```

with a field mask such as:

```text
updateMask=draftGrade,assignedGrade
```

Google recommends setting both fields to fully grade an assignment. Setting
only `assignedGrade` can produce unintended behavior in the Classroom UI.

The request must come from the Google Cloud Developer Console project associated
with the OAuth client that created the corresponding coursework. Google returns
`PERMISSION_DENIED` when the requesting project did not create that coursework,
even if the user otherwise has teacher access.

Consequently:

```text
Pink STEM creates an assignment through its OAuth project
  → Pink STEM can update that assignment's student submissions and grades

A teacher manually creates an unrelated assignment in Classroom
  → Pink STEM must not assume it can update that assignment's grades
```

This restriction means Route A should use a clear ownership model: assignments
that require automated Pink STEM grading must be created by Pink STEM's Google
Cloud project on behalf of an authorized course teacher.

### Returning work

After grading, a teacher-authorized integration may call
`studentSubmissions.return`. Unlike the Classroom user interface, the API's
return operation does not copy the draft grade into the assigned grade. Pink
STEM must explicitly set the intended grade fields before returning work.

### Grade limitations

According to Google's
[grade management guide](https://developers.google.com/workspace/classroom/guides/classroom-api/manage-grades):

- The API reads and writes assignment-level grades on `StudentSubmission`.
- It does not read or write an overall course grade. Pink STEM could calculate a
  summary from assignment data, but that calculated value would not be a
  writable Classroom overall-grade field.
- Rubric scores are readable but cannot be set through the general Classroom
  API.

## Does a school administrator have to approve the app?

There are three independent authorization or approval layers.

### 1. User OAuth consent

The teacher must authorize the scopes Pink STEM requests. The token operates on
that user's behalf and cannot exceed that user's Classroom permissions.

### 2. Google OAuth application verification

Google separately reviews public production applications that request sensitive
or restricted user-data scopes unless an exemption applies. Development and
testing projects can use explicitly configured test users, but they are not a
substitute for production verification.

Depending on the scopes and publishing model, verification can require verified
domains, an application home page, a privacy policy, scope justifications, and a
video demonstrating the OAuth flow and the features that use the scopes. Google
requires production applications to request only scopes needed by implemented
features.

References:

- [OAuth app verification](https://support.google.com/cloud/answer/13463073)
- [OAuth production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance)
- [Sensitive-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)

### 3. Google Workspace school administration

A Google Workspace for Education administrator controls whether users in their
domain may authorize applications to access Classroom data. The setting can be
applied by domain or organizational unit. Administrators can also configure
third-party OAuth applications as trusted, limited, specifically allowed, or
blocked.

Therefore, the precise answer is:

> School administrator approval is not mandated for every app in every Google
> Workspace configuration, but teacher consent alone is not guaranteed to work.
> Pink STEM must plan for each participating education domain to review and
> potentially trust or allowlist its OAuth client before teachers or students
> can connect.

This administrative dependency is separate from Google's own OAuth application
verification. Completing Google verification does not force a school to allow
the app, and a school trusting an app does not replace any required Google
verification.

Reference:
[Set Classroom data access](https://support.google.com/edu/classroom/answer/6250906).

### REST integration versus Classroom add-on

The REST API integration evaluated here does not inherently require Pink STEM
to be a Classroom add-on. An add-on is a separate integration path for embedding
or attaching third-party activities inside the Classroom interface and has
additional Marketplace installation and administrator controls. Listing
courses, importing rosters, creating coursework, and performing grade passback
can be evaluated through the REST API without first building an add-on.

## Google Sites curriculum extraction

### Supported Sites API

Google's supported developer page states that the Sites API is deprecated, can
access only classic Google Sites, and cannot access the rebuilt Sites product
launched in 2016. It is not a viable new integration for a modern Google Site.

Reference:
[Google Sites API](https://developers.google.com/workspace/sites).

### Google Drive API

Modern Google Sites appear as items in Google Drive, but the Drive API's
supported `files.export` formats cover Docs, Sheets, Slides, Drawings, Apps
Script, and Vids—not Sites. The Drive API can help access separately shared
source documents or media, but it does not provide a supported structured
export of a modern Site's pages and layout.

Reference:
[Drive export MIME types](https://developers.google.com/workspace/drive/api/guides/ref-export-formats).

### Google Takeout

Google Takeout supports exporting Sites data. Google's documentation says the
archive includes draft and published sites, embedded URLs/pages, text, images,
links, navigation, themes, buttons, announcements, attachments, and other site
content.

Takeout is a one-time, user-initiated or administrator-managed data export. It
is not an API that Pink STEM can call during normal application requests. Work
or school accounts may also restrict which data can be exported.

Reference:
[Export Google Sites data](https://support.google.com/sites/answer/9759608).

### Manual migration

If a Takeout archive does not preserve Aviation content in a form that can be
reliably transformed, the remaining supported approach is controlled manual
migration: copy the lesson text, download authorized assets, recreate links and
embeds, and validate every lesson against the original.

Because Aviation is the only course currently being developed, a measured
one-time migration remains a viable option. It should be evaluated on a
representative Aviation lesson instead of rejected based on the hypothetical
cost of dozens of future courses.

### Published-page scraping

A published page's rendered HTML might be technically retrievable when access
permits, but this is not an official Sites content API. Generated markup,
navigation discovery, embedded-resource permissions, and fidelity are not
stable contracts. Scraping should not be the production foundation for Route A.

### Sites extraction verdict

| Approach                | Modern Sites support             | Automation level   | Recommendation                                                                         |
| ----------------------- | -------------------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| Sites API               | No                               | API                | Do not use for modern Sites.                                                           |
| Drive `files.export`    | No supported Sites export format | API                | Use only for separately accessible source files, not the Site structure.               |
| Google Takeout          | Yes                              | User/admin archive | Preferred first experiment for one-time Aviation extraction.                           |
| Manual copy             | Yes                              | Manual             | Valid fallback for the one in-scope course; measure effort on a representative lesson. |
| Scraping rendered pages | Not a supported content contract | Custom automation  | Do not make it the production dependency.                                              |

## Personal-account Classroom API experiment

The repository includes the dependency-free Node 20 script
[`classroom-list-courses.mjs`](./classroom-list-courses.mjs). It implements a
desktop OAuth loopback flow and calls `courses.list` with only the
`classroom.courses.readonly` scope.

### What the experiment proves

When completed with a personal test account, it proves that:

- the Classroom API can be enabled for a Google Cloud project;
- the OAuth consent flow can grant a Classroom scope;
- the returned access token can call the Classroom REST API; and
- the account's visible courses can be listed with their IDs and states.

It does not prove that a school Workspace domain will allow the app, that a
teacher has write access, or that grade passback works. Those require different
scopes, a teacher-owned test course, and potentially administrator policy.

### Safe setup and execution

1. Create a temporary Google Cloud project.
2. Enable the Google Classroom API.
3. Configure the OAuth consent screen for external testing.
4. Add the personal Google account as a test user.
5. Create an OAuth client of type **Desktop app**.
6. Download its client-secret JSON outside the repository.
7. Run:

   ```sh
   node docs/spikes/classroom-list-courses.mjs \
     /absolute/path/outside/repo/client_secret.json
   ```

8. Open the printed Google authorization URL, sign in with the personal account,
   and approve the read-only course permission.
9. Google redirects the browser to the script's temporary loopback server. The
   script exchanges the authorization code and prints every visible course.

The script does not persist access or refresh tokens. The client-secret file,
OAuth tokens, browser cookies, real student data, and real nonprofit or school
credentials must never be committed.

An account with no visible courses should successfully print `No courses
found.` That still validates OAuth and API access. An authorization failure
should be documented with its sanitized error code, requested scope, account
type, attempted setup, and the exact policy or configuration step that blocked
it.

## Route A feasibility and recommendation

### Capability assessment

| Capability                                               | Assessment                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Teacher connects a Google account                        | Supported through OAuth, subject to app and domain controls.                  |
| List the teacher's courses                               | Supported.                                                                    |
| Import course teachers and students                      | Supported with roster scopes and pagination.                                  |
| Match Classroom users to Pink STEM users                 | Supported using Google user IDs; reading email requires an additional scope.  |
| Read coursework                                          | Supported within the connected user's permissions.                            |
| Read submissions and assignment grades                   | Supported within the connected user's permissions.                            |
| Create Aviation coursework in a teacher's course         | Supported when the connected user is a teacher and grants the write scope.    |
| Write assignment grades                                  | Supported for coursework associated with Pink STEM's Google Cloud project.    |
| Write grades to arbitrary teacher-created coursework     | Not a reliable supported assumption because of developer-project association. |
| Read/write an overall course grade                       | Not supported as a direct Classroom API field.                                |
| Write rubric scores                                      | Not supported by the general Classroom API.                                   |
| Connect across school domains without admin coordination | Cannot be assumed. Each domain controls third-party access.                   |
| Programmatically extract a modern Google Site            | Not supported by the Sites API.                                               |
| Perform a one-time modern Sites export                   | Supported through Takeout, subject to account/admin export controls.          |

### Recommendation

Proceed with Route A only with the following explicit boundaries:

1. Use per-teacher OAuth authorization to connect a specific Classroom course.
2. Store Google course and user identifiers needed for synchronization, while
   keeping Google Classroom authoritative for its roster and assignment data.
3. Request read-only scopes by default and request the coursework write scope
   only for educators using assignment creation or grade passback.
4. Create through Pink STEM every coursework item that Pink STEM must grade
   automatically. Do not promise grade passback for arbitrary pre-existing
   assignments.
5. Treat school administrator review/allowlisting and Google OAuth verification
   as launch work, not as optional cleanup after implementation.
6. Do not design modern Google Sites as a live content API dependency. For
   Aviation, first test an authorized Takeout archive; if fidelity is
   insufficient, perform a controlled manual migration or retain stable link-outs.
7. Keep the production integration behind the repository's existing layers:
   UI, feature hook, typed internal HTTP client, thin API route, service logic,
   and a dedicated Google Classroom adapter. OAuth tokens and Google API calls
   must remain server-side.

Route A can therefore support a useful Pink STEM dashboard and a controlled
assignment-to-grade workflow. Its viability depends on accepting the assignment
ownership rule, planning for school administrator coordination, and treating
Google Sites extraction as migration rather than live API synchronization.

## Sources

All capability claims above are based on primary Google documentation:

- [Google Classroom REST API reference](https://developers.google.com/workspace/classroom/reference/rest)
- [Choose Classroom API scopes](https://developers.google.com/workspace/classroom/guides/auth)
- [Manage coursework](https://developers.google.com/workspace/classroom/guides/manage-coursework)
- [Set and update grades](https://developers.google.com/workspace/classroom/guides/classroom-api/manage-grades)
- [Import Classroom rosters](https://developers.google.com/workspace/classroom/tutorials/import-rosters)
- [Classroom API overview](https://support.google.com/edu/classroom/answer/6253304)
- [Set Classroom data access](https://support.google.com/edu/classroom/answer/6250906)
- [Control Google Workspace app access](https://support.google.com/a/answer/7281227)
- [OAuth app verification](https://support.google.com/cloud/answer/13463073)
- [Google Sites API](https://developers.google.com/workspace/sites)
- [Export Google Sites data](https://support.google.com/sites/answer/9759608)
- [Google Drive export formats](https://developers.google.com/workspace/drive/api/guides/ref-export-formats)
