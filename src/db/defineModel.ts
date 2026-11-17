import { HydratedDocument, model, Model, models, Schema } from "mongoose";
import type { Doc } from "@/types/models";

/**
 * Registers a model once. Next.js re-evaluates modules in development, and
 * Mongoose throws if the same model name is compiled twice.
 */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (models[name] as Model<T> | undefined) ?? model<T>(name, schema);
}

/**
 * Waits for a model's indexes, for DAOs that rely on a unique index existing
 * on a fresh database. Mongoose keeps init()'s first promise, even a rejected
 * one, so a failed build is forgotten here and retried on the next call.
 */
export async function ensureIndexes<T>(model: Model<T>): Promise<void> {
  try {
    await model.init();
  } catch (error) {
    delete (model as { $init?: unknown }).$init;
    throw error;
  }
}

/** Converts a freshly created document to the plain shape the DAOs return. */
export function toDoc<T>(document: HydratedDocument<T>): Doc<T> {
  return document.toObject() as unknown as Doc<T>;
}
