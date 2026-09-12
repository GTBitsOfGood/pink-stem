# Aviation Content Model Spike

**Status:** Based on one lesson's worth of source material.

## 1. Lesson inventory

| Name                                         | Source format                                                                                              | Rough length                                                    | Grade level | Content type                                                                                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aerodynamics: Airplane Design & Optimization | Teacher Guide (Google Docs), Student Workbook (Google Slides), Abbreviated Student Worksheet (Google Docs) | ~10 min intro video + one class period of build/test/reflection | High School | Hands-on design lab: direct instruction, embedded formative questions, drag-and-drop interaction, fillable data table, hands-on build/test activity, reflection questions, exit ticket |

Note: these three files are not three separate lessons. They are three linked
artifacts for a single lesson — a teacher-facing guide, and two
student-facing variants (a full interactive workbook and an abbreviated
worksheet) that a teacher chooses between. See open questions below on how
that should map onto the schema.

## 2. Content block types observed

- Rich text / instructional copy (purpose, curriculum connections, vocab)
- Video embed (intro video, ~10 min)
- Interactive Q&A prompt ("Answer Me!" boxes)
- Drag-and-drop / matching interaction (identify which plane has less drag)
- Fillable data table (design trials: description, control surfaces, distance, flight time)
- Materials / kit list (structured, tabular — teacher kit vs. student kit)
- External resource link (Fold N' Fly, PowerUp tutorial, flight simulator, etc.)
- Standards metadata (NGSS codes: HS-ETS1-3, HS-ETS1.B, HS-ETS1.C, HS-PS3-3)
- External form embed (mandatory exit ticket)

## 3. Proposed schema

`Course > Module > Lesson > ContentBlock`, with one escape-hatch
`ContentBlock` type rather than a type per content format.

### Embed vs. reference decision

**Lessons live in their own collection, referenced from Module.**
`ContentBlock`s embed inside their parent Lesson document.

Reasoning:

- A single lesson's content (text, structured tables, standards metadata,
  interaction definitions) is on the order of tens of KB as data — nowhere
  near 16MB on its own, _provided actual media (video, images) is stored as
  URLs to blob storage rather than inline binary/base64_. That constraint
  should be enforced at the `ContentBlock` schema level, not just assumed.
- If Lessons were embedded inside the Course document, a course with even a
  modest number of modules and lessons would put the _entire course's_
  content into one document. Any edit to any lesson requires reading and
  rewriting the whole course document, and growth is unbounded and shared
  across every lesson in the course — one bloated lesson (e.g. one with many
  large data tables or many blocks) risks pushing the whole course toward the
  cap, not just itself.
- Keeping Lessons in their own collection means the 16MB ceiling applies per
  lesson, not per course, and lesson reads/writes/edits don't require
  touching the course document at all. This also matches how an admin UI
  would likely work: editors work lesson-by-lesson.
- Modules stay embedded in Course, since a Module is a thin structural
  grouping (title, order, ordered list of Lesson references) that doesn't
  grow the way lesson content does.

### Mongoose schemas

```javascript
// src/db/models/ContentBlock.ts
// Embedded subdocument — not its own collection.
const ContentBlockSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "rich_text",
        "video_embed",
        "interactive_prompt",
        "data_table",
        "resource_list",
        "external_link",
        "standards_metadata",
        "external_form",
        "generic", // escape hatch for anything not covered above
      ],
    },
    order: { type: Number, required: true },
    sourceFormat: { type: String }, // e.g. "Google Docs", "Google Slides", "Excel", "Canva"
    // Flexible payload — shape depends on `type`. Media fields inside `data`
    // must be URLs (S3/blob storage), never inline binary.
    data: { type: Schema.Types.Mixed, required: true },
  },
  { _id: true }
);

// src/db/models/Lesson.ts
// Own top-level collection.
const LessonSchema = new Schema(
  {
    title: { type: String, required: true },
    roughLength: { type: String }, // e.g. "1 class period"
    gradeLevel: { type: String, required: true },
    contentBlocks: [ContentBlockSchema],
  },
  { timestamps: true }
);

// src/db/models/Module.ts
// Embedded subdocument inside Course — thin structural grouping only.
const ModuleSchema = new Schema(
  {
    title: { type: String, required: true },
    order: { type: Number, required: true },
    lessons: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
  },
  { _id: true }
);

// src/db/models/Course.ts
const CourseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    modules: [ModuleSchema],
  },
  { timestamps: true }
);
```

### Document interfaces

```typescript
interface IContentBlock {
  _id: Types.ObjectId;
  type:
    | "rich_text"
    | "video_embed"
    | "interactive_prompt"
    | "data_table"
    | "resource_list"
    | "external_link"
    | "standards_metadata"
    | "external_form"
    | "generic";
  order: number;
  sourceFormat?: string; // e.g. "Google Docs", "Google Slides", "Excel", "Canva"
  data: unknown; // narrow per `type` at the service layer
}

interface ILesson {
  _id: Types.ObjectId;
  title: string;
  roughLength?: string;
  gradeLevel: string;
  contentBlocks: IContentBlock[];
  createdAt: Date;
  updatedAt: Date;
}

interface IModule {
  _id: Types.ObjectId;
  title: string;
  order: number;
  lessons: Types.ObjectId[]; // populated to ILesson[] when needed
}

interface ICourse {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  modules: IModule[];
  createdAt: Date;
  updatedAt: Date;
}
```

## 4. Authoring recommendation

**Preliminary, pending more of the course.**

- The source material relies on interaction types (embedded "Answer Me!"
  prompts, a drag-and-drop question, a fillable data table, a
  motor-attachment branching step) that don't reduce cleanly to a "keep
  authoring in Google and import" pipeline — a straight import would either
  lose that interactivity or require a fairly involved custom parser per
  Google Slides layout.
- Between "staff-authored admin UI" and "CMS," current lean is toward a
  **custom admin UI**. This lesson's interactions (drag-and-drop, equipment
  branching, inline prompts) already push past what a typical CMS handles
  out of the box, so we'd likely end up building custom blocks either way.

  This lean flips if content changes turn out to be frequent and mostly done
  by non-technical staff — a custom UI means every new edit type is
  engineering work, which gets expensive at that pace. A CMS is worth
  revisiting if that's the case.
