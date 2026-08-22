import mongoose, { Schema, model, models } from "mongoose";

const NoteSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, default: "" },
  },
  { timestamps: true }
);

export type Note = mongoose.InferSchemaType<typeof NoteSchema> & { _id: string };
export default models.Note || model("Note", NoteSchema);
