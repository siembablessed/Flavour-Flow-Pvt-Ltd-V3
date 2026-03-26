import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  PAYNOW_INTEGRATION_ID: z.string().min(1),
  PAYNOW_INTEGRATION_KEY: z.string().min(1),
  PAYNOW_RESULT_URL: z.string().url(),
  PAYNOW_RETURN_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  PAYNOW_ALLOWED_ORIGINS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid server environment configuration: ${issues}`);
}

const configuredOrigins = parsed.data.PAYNOW_ALLOWED_ORIGINS
  ? parsed.data.PAYNOW_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [parsed.data.FRONTEND_URL];

export const env = {
  ...parsed.data,
  allowedOrigins: Array.from(new Set(configuredOrigins)),
};
