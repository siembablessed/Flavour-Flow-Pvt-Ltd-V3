import { z } from "zod";

const envSchema = z.object({
  PAYNOW_INTEGRATION_ID: z.string().min(1),
  PAYNOW_INTEGRATION_KEY: z.string().min(1),
  PAYNOW_RESULT_URL: z.string().url(),
  PAYNOW_RETURN_URL: z.string().url(),
  PAYNOW_COOKIE_SECRET: z.string().min(16),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

let cached: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cached) {
    return cached;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid API environment: ${issues}`);
  }

  cached = parsed.data;
  return cached;
}
