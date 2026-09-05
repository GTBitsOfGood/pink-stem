import { z } from "zod";
import {
  dateInputSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  text,
} from "@/utils/validation/common";

export const registerSchema = z.object({
  firstName: text(60),
  lastName: text(60),
  email: emailSchema,
  password: passwordSchema,
  dateOfBirth: dateInputSchema,
  guardianEmail: emailSchema.optional(),
  phone: phoneSchema.optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const googleSchema = z.object({ credential: z.string().min(1) });

export const emailOnlySchema = z.object({ email: emailSchema });

export const tokenSchema = z.object({ token: z.string().min(1) });

export const resetPasswordSchema = tokenSchema.extend({
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const acceptInviteSchema = tokenSchema.extend({
  firstName: text(60),
  lastName: text(60),
  password: passwordSchema,
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
