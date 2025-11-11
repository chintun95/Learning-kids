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
  name: sanitizedZString().pipe(
    z.string().min(2, "Name must be at least 2 characters long")
  ),
  relationship: sanitizedZString().pipe(
    z.string().min(2, "Relationship must be at least 2 characters long")
  ),

  // Phone number: auto-format xxx-xxx-xxxx
  phoneNumber: sanitizedZString().pipe(
    z
      .string()
      .regex(/^\d{10}$|^\d{3}-\d{3}-\d{4}$/, "Phone number must be 10 digits")
      .transform((val) => {
        // Strip non-digits
        const digits = val.replace(/\D/g, "");
        // If valid 10 digits, format as xxx-xxx-xxxx
        if (digits.length === 10) {
          return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(
            6
          )}`;
        }
        return val; // fallback (let validation handle wrong cases)
      })
  ),
  streetAddress: sanitizedZString().pipe(
    z.string().min(5, "Street address must be at least 5 characters long")
  ),
  city: sanitizedZString().pipe(
    z.string().min(2, "City must be at least 2 characters long")
  ),
  state: sanitizedZString().pipe(
    z.string().min(2, "State must be at least 2 characters long")
  ),
  zipcode: sanitizedZString().pipe(
    z
      .string()
      .min(3, "Zip code must be at least 3 digits")
      .max(10, "Zip code must be less than 10 digits")
      .regex(/^[A-Za-z0-9\s-]+$/, "Invalid zip code format")
  ),
});

// -----------------------------
// Profile Update Schema
// -----------------------------
const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB
const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// Use built-in z.any() since React Native returns ImagePicker result objects
export const updateProfileSchema = z
  .object({
    firstName: sanitizedZString()
      .nullable()
      .optional()
      .pipe(z.string().min(2, "First name must be at least 2 characters long")),

    lastName: sanitizedZString()
      .nullable()
      .optional()
      .pipe(z.string().min(2, "Last name must be at least 2 characters long")),

    emailAddress: sanitizedZString()
      .nullable()
      .optional()
      .pipe(z.string().email("Invalid email address")),

    newPassword: z
      .string()
      .nullable()
      .optional()
      .refine(
        (val) => !val || val.length >= 12,
        "Password must be at least 12 characters long"
      )
      .refine(
        (val) =>
          !val ||
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[{\]};:'",.<>/?\\|`~])/.test(
            val
          ),
        "Password must include uppercase, lowercase, number, and special character"
      ),

    confirmPassword: z
      .string()
      .nullable()
      .optional()
      .refine(
        (val) => !val || val.length >= 12,
        "Password must be at least 12 characters long"
      ),

    imageSource: z
      .any()
      .nullable()
      .optional()
      .refine(
        (file) => !file || (file?.size && file.size <= MAX_FILE_SIZE),
        "Image must be less than 5MB"
      )
      .refine(
        (file) => !file || ACCEPTED_IMAGE_MIME_TYPES.includes(file?.type),
        "Only .jpg, .jpeg, .png, and .webp formats are supported"
      ),
  })
  .refine(
    (data) =>
      !data.newPassword ||
      !data.confirmPassword ||
      data.newPassword === data.confirmPassword,
    {
      message: "Passwords must match",
      path: ["confirmPassword"],
    }
  );

// -----------------------------
// Helper Functions
// -----------------------------
// --- Verification Code Schema (new, used for verifying) ---
export const verificationCodeSchema = z.object({
  code: sanitizedZString().pipe(
    z.string().min(1, "Verification code is required")
  ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

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
