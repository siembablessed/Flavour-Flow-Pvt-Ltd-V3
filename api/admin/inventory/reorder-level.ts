import { z } from "zod";
import type { ApiRequest, ApiResponse } from "../../_lib/httpTypes.js";
import { getEnv } from "../../_lib/env.js";
import { AdminInventoryError, updateAdminReorderLevel } from "../../../shared/adminInventory.js";

const schema = z.object({
  productId: z.string().trim().min(1).max(50),
  locationCode: z.string().trim().min(1).max(50),
  reorderLevelCases: z.number().min(0),
});

function parseAdminEmails(value?: string): string[] {
  return value?.split(",").map((email) => email.trim()).filter(Boolean) ?? [];
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid reorder level payload", details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const env = getEnv();
    const result = await updateAdminReorderLevel({
      supabaseUrl: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      adminEmails: parseAdminEmails(env.ADMIN_EMAILS),
      authorizationHeader: req.headers.authorization,
    }, parsed.data);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AdminInventoryError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to update reorder level";
    res.status(500).json({ error: message });
  }
}
