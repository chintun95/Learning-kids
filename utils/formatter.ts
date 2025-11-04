import { z } from "zod";

// -----------------------------
// Security Utilities
// -----------------------------
export const sanitizeInput = (input: string) =>
  input.replace(/['";]/g, "").replace(/[<>]/g, "").trim();
const sanitizedZString = () =>
  z.string().transform((val) => sanitizeInput(val));

// -----------------------------
// Authentication Schemas
// -----------------------------
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[{\]};:'",.<>/?\\|`~]).{12,}$/;

// -----------------------------
// Date and Time Formatting
// -----------------------------
export const dateSchema = z
  .union([z.date(), z.string().datetime()])
  .transform((val) => {
    const date = typeof val === "string" ? new Date(val) : val;
    if (isNaN(date.getTime())) throw new Error("Invalid date format");
    return date.toISOString(); // store as ISO string
  });

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, "Invalid time format")
  .or(z.date())
  .transform((val) =>
    val instanceof Date ? val.toTimeString().split(" ")[0] : val
  );

export const americanDateSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), "Invalid date")
  .transform((val) => {
    const date = new Date(val);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  });

// --- Sign Up Schema ---
export const signUpSchema = z
  .object({
    firstName: sanitizedZString().pipe(z.string().min(2).max(50)),
    lastName: sanitizedZString().pipe(z.string().min(2).max(50)),
    email: sanitizedZString().pipe(z.string().email("Invalid email address")),
    code: sanitizedZString().pipe(z.string().min(1, "Code is required")),
    password: sanitizedZString().pipe(
      z
        .string()
        .min(12, "Password must be at least 12 characters long")
        .regex(
          strongPasswordRegex,
          "Password must include uppercase, lowercase, number, and special character"
        )
    ),
    confirmPassword: sanitizedZString(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

// --- Sign In Schema ---
export const signInSchema = z.object({
  email: sanitizedZString().pipe(z.string().email("Invalid email address")),
  password: sanitizedZString().pipe(
    z
      .string()
      .min(12, "Password must be at least 12 characters long")
      .regex(
        strongPasswordRegex,
        "Password must include uppercase, lowercase, number, and special character"
      )
  ),
});

// --- Password Reset Schema ---
export const passwordResetObjectSchema = z.object({
  email: sanitizedZString().pipe(z.string().email("Invalid email address")),
  code: sanitizedZString(),
  password: sanitizedZString().pipe(
    z
      .string()
      .min(12, "Password must be at least 12 characters long")
      .regex(
        strongPasswordRegex,
        "Password must include uppercase, lowercase, number, and special character"
      )
  ),
  confirmPassword: sanitizedZString(),
});

export const passwordResetSchema = passwordResetObjectSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords must match",
    path: ["confirmPassword"],
  }
);

// -----------------------------
// Child PIN Schema
// -----------------------------
export const childPinSchema = sanitizedZString().pipe(
  z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits")
);

// -----------------------------
// Emergency Contact Schema
// -----------------------------
export const emergencyContactSchema = z.object({
  name: sanitizedZString().pipe(z.string().min(2)),
  relationship: sanitizedZString().pipe(z.string().min(2)),
  phoneNumber: sanitizedZString().pipe(
    z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number")
  ),
  streetAddress: sanitizedZString().pipe(z.string().min(5)),
  city: sanitizedZString().pipe(z.string().min(2)),
  state: sanitizedZString().pipe(z.string().min(2)),
});

// -----------------------------
// Helper Functions
// -----------------------------
export function formatSignUp(data: unknown) {
  return signUpSchema.parse(data);
}

export function formatSignIn(data: unknown) {
  return signInSchema.parse(data);
}

export function formatPasswordReset(data: unknown) {
  return passwordResetSchema.parse(data);
}

export function formatDate(date: string | Date) {
  return dateSchema.parse(date);
}

export function formatTime(time: string | Date) {
  return timeSchema.parse(time);
}

export function formatChildPin(pin: string) {
  return childPinSchema.parse(pin);
}

export function formatEmergencyContact(data: unknown) {
  return emergencyContactSchema.parse(data);
}

export function formatToAmericanDate(date: string) {
  return americanDateSchema.parse(date);
}
