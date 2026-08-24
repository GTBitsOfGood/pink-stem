import { Types } from "mongoose";
import { z } from "zod";

export const objectIdSchema = z
  .string()
  .refine((value) => Types.ObjectId.isValid(value));

export const noteTitleSchema = z.string().trim().min(1).max(200);

export const noteBodySchema = z.string().max(10_000);

export function objectIdIsValid(id: string): boolean {
  return objectIdSchema.safeParse(id).success;
}

export function titleIsValid(title: unknown): boolean {
  return noteTitleSchema.safeParse(title).success;
}
