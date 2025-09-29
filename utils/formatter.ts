// utils/formatter.ts
import { z } from "zod";

// -----------------------------
// Date and Time Formatting
// -----------------------------

/**
 * Ensures dates are properly stored in Supabase as ISO 8601 strings (UTC).
 * Example: "2025-09-27T18:32:00.000Z"
 */
export const dateSchema = z
  .union([z.date(), z.string().datetime()])
  .transform((val) => {
    const date = typeof val === "string" ? new Date(val) : val;
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    return date.toISOString(); // Supabase expects ISO string
  });

/**
 * Ensures times are stored in "HH:mm:ss" format.
 * Example: "14:05:30"
 */
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, "Invalid time format")
  .or(z.date())
  .transform((val) => {
    if (val instanceof Date) {
      return val.toTimeString().split(" ")[0]; // "HH:mm:ss"
    }
    return val;
  });

// -----------------------------
// Authentication Input Schemas
// -----------------------------

// Sign-up schema
export const signUpSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .max(50),
    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .max(50),
    phoneNumber: z
      .string()
      .regex(
        /^\+?[1-9]\d{1,14}$/,
        "Invalid phone number (E.164 format expected)"
      ),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

// Sign-in schema
export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// -----------------------------
// Helper Functions
// -----------------------------

/**
 * Validates and formats a sign-up payload.
 */
export function formatSignUp(data: unknown) {
  return signUpSchema.parse(data);
}

/**
 * Validates and formats a sign-in payload.
 */
export function formatSignIn(data: unknown) {
  return signInSchema.parse(data);
}

/**
 * Formats a date for Supabase storage.
 */
export function formatDate(date: string | Date) {
  return dateSchema.parse(date);
}

/**
 * Formats a time for Supabase storage.
 */
export function formatTime(time: string | Date) {
  return timeSchema.parse(time);
}
