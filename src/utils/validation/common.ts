import { z } from "zod";
import { PAGE_SIZE, PASSWORD_MIN_LENGTH } from "@/constants/limits";
import { fromDateTimeLocal } from "@/lib/dates";
import ERRORS from "@/utils/errorMessages";

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "must be a valid id");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("must be a valid email address"));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, ERRORS.AUTH.WEAK_PASSWORD)
  .regex(/\d/, ERRORS.AUTH.WEAK_PASSWORD);

export const phoneSchema = z.string().trim().min(7).max(25);

export const dateSchema = z.coerce.date();

/** A `YYYY-MM-DD` value read as midnight in Pink STEM's time zone. */
export const dateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date (YYYY-MM-DD)")
  .transform(fromDateTimeLocal);

/** The last instant of a `YYYY-MM-DD` day, so ranges include their end date. */
export const endOfDayInputSchema = dateInputSchema.transform(
  (start) => new Date(start.getTime() + 24 * 3_600_000 - 1)
);

export const text = (max: number, min = 1) =>
  z.string().trim().min(min).max(max);

export const optionalText = (max: number) =>
  z.string().trim().max(max).optional();

export const pageSchema = z.coerce.number().int().min(1).default(1);

/** Query strings carry booleans as text. */
export const queryBoolean = z.preprocess(
  (value) =>
    value === "true" || value === "1"
      ? true
      : value === "false" || value === "0"
        ? false
        : value,
  z.boolean()
);

export const paginate = (page: number) => ({
  skip: (page - 1) * PAGE_SIZE,
  limit: PAGE_SIZE,
});

export const dateRangeSchema = z.object({
  from: dateInputSchema.optional(),
  to: endOfDayInputSchema.optional(),
});
