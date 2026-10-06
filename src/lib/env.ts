import "server-only";
import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: optional(z.string()),
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.url().default("http://localhost:3000")),
  AUTH_SECRET: optional(z.string().min(32, "AUTH_SECRET must be at least 32 characters")),
  CLOUDINARY_CLOUD_NAME: optional(z.string()),
  CLOUDINARY_API_KEY: optional(z.string()),
  CLOUDINARY_API_SECRET: optional(z.string()),
}).superRefine((env, ctx) => {
  // Cloudinary is all-or-nothing: a half-configured storage account fails fast.
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const;
  if (keys.some((k) => env[k]) && !keys.every((k) => env[k])) {
    for (const k of keys) if (!env[k]) ctx.addIssue({ code: "custom", path: [k], message: "Required when any CLOUDINARY_* variable is set" });
  }
});

export type Env = z.infer<typeof serverSchema>;

let cached: Env | undefined;

/** Validated server environment. Parsed lazily so `next build` works without secrets. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** For features that need a var only when used (auth, storage). */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = getEnv()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<Env[K]>;
}
