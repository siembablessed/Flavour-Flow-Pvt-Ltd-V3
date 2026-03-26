import { z } from "zod";

const envSchema = z.object({
  PAYNOW_INTEGRATION_ID: z.string().min(1),
  PAYNOW_INTEGRATION_KEY: z.string().min(1),
  PAYNOW_RESULT_URL: z.string().url(),
  PAYNOW_RETURN_URL: z.string().url(),
  PAYNOW_COOKIE_SECRET: z.string().min(16),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  PAYNOW_ALLOWED_ORIGINS: z.string().optional(),
  ANON_CART_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(6),
});

type ApiEnv = z.infer<typeof envSchema> & { allowedOrigins: string[] };

let cached: ApiEnv | null = null;

export function getEnv(): ApiEnv {
  if (cached) {
    return cached;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid API environment: ${issues}`);
  }

  const configuredOrigins = parsed.data.PAYNOW_ALLOWED_ORIGINS
    ? parsed.data.PAYNOW_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [parsed.data.FRONTEND_URL];

  cached = {
    ...parsed.data,
    allowedOrigins: Array.from(new Set(configuredOrigins)),
  };

  return cached;
}
