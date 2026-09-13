import { z } from "zod";
import { MAX_BIO_LENGTH } from "@/constants/limits";
import {
  NOTIFICATION_CATEGORIES,
  REGIONS,
  SHIRT_SIZES,
  SKILLS,
} from "@/types/user";
import {
  dateInputSchema,
  emailSchema,
  optionalText,
  phoneSchema,
  text,
} from "@/utils/validation/common";

export const updateProfileSchema = z
  .object({
    firstName: text(60),
    lastName: text(60),
    phone: phoneSchema.or(z.literal("")),
    city: optionalText(80),
    region: z.enum(REGIONS),
    dateOfBirth: dateInputSchema,
    guardianEmail: emailSchema.or(z.literal("")),
    emergencyContact: z.object({
      name: text(100, 0),
      phone: z.string().trim().max(25),
    }),
    skills: z.array(z.enum(SKILLS)),
    interests: z.array(z.enum(SKILLS)),
    shirtSize: z.enum(SHIRT_SIZES),
    bio: z.string().trim().max(MAX_BIO_LENGTH),
    notificationPreferences: z.partialRecord(
      z.enum(NOTIFICATION_CATEGORIES),
      z.boolean()
    ),
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
