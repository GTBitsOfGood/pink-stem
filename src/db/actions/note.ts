import { HydratedDocument, Types } from "mongoose";
import dbConnect from "../dbConnect";
import NoteModel, { Note, NoteDocument } from "../models/note";
import ERRORS from "@/utils/errorMessages";

/**
 * Data access layer for notes. Every method owns its own `dbConnect()` call and
 * speaks only Mongoose. Business rules belong in `@/services/note`, not here.
 */
export default class NoteDAO {
  static async createNote(
    title: string,
    body: string
  ): Promise<HydratedDocument<NoteDocument>> {
    await dbConnect();
    try {
      return await NoteModel.create({ title, body });
    } catch (error) {
      console.log(error);
      throw new Error(ERRORS.NOTE.FAILURE.CREATE);
    }
  }

  static async getAllNotes(): Promise<HydratedDocument<NoteDocument>[]> {
    await dbConnect();
    return await NoteModel.find().sort({ createdAt: -1 });
  }

  static async getNoteById(
    noteId: string
  ): Promise<HydratedDocument<NoteDocument> | null> {
    await dbConnect();
    return await NoteModel.findById(new Types.ObjectId(noteId));
  }

  static async updateNoteById(
    noteId: string,
    updates: Partial<Pick<Note, "title" | "body">>
  ): Promise<HydratedDocument<NoteDocument> | null> {
    await dbConnect();
    try {
      return await NoteModel.findByIdAndUpdate(
        new Types.ObjectId(noteId),
        updates,
        { returnDocument: "after", runValidators: true }
      );
    } catch (error) {
      console.log(error);
      throw new Error(ERRORS.NOTE.FAILURE.UPDATE);
    }
  }

  /** Returns the deleted document, or null when no note had that id. */
  static async deleteNoteById(
    noteId: string
  ): Promise<HydratedDocument<NoteDocument> | null> {
    await dbConnect();
    try {
      return await NoteModel.findByIdAndDelete(new Types.ObjectId(noteId));
    } catch (error) {
      console.log(error);
      throw new Error(ERRORS.NOTE.FAILURE.DELETE);
    }
  }
}
