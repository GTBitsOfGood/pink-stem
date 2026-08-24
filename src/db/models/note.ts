import { Document, Model, model, models, Schema, Types } from "mongoose";

export interface Note {
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteDocument extends Note, Document {
  _id: Types.ObjectId;
}

const noteSchema = new Schema<NoteDocument>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
  },
  { timestamps: true }
);

const NoteModel: Model<NoteDocument> =
  (models.Note as Model<NoteDocument>) ||
  model<NoteDocument>("Note", noteSchema);

export default NoteModel;
