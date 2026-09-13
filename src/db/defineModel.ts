import { HydratedDocument, model, Model, models, Schema } from "mongoose";
import type { Doc } from "@/types/models";

/**
 * Registers a model once. Next.js re-evaluates modules in development, and
 * Mongoose throws if the same model name is compiled twice.
 */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (models[name] as Model<T> | undefined) ?? model<T>(name, schema);
}

/** Converts a freshly created document to the plain shape the DAOs return. */
export function toDoc<T>(document: HydratedDocument<T>): Doc<T> {
  return document.toObject() as unknown as Doc<T>;
}
