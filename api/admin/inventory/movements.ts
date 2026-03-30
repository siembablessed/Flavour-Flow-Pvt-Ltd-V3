import { z } from "zod";
import type { ApiRequest, ApiResponse } from "../../_lib/httpTypes.js";
import { getEnv } from "../../_lib/env.js";
import {
  AdminInventoryError,
  loadAdminInventoryMovements,
  recordAdminInventoryMovement,
} from "../../../shared/adminInventory.js";

const schema = z.object({
  movementType: z.enum(["stock_in", "stock_out", "reserve", "release", "adjustment_plus", "adjustment_minus"]),
  productId: z.string().trim().min(1).max(50),
  locationCode: z.string().trim().min(1).max(50),
  quantityCases: z.number().positive(),
  note: z.string().trim().max(500).optional().nullable(),
  referenceType: z.string().trim().max(100).optional().nullable(),
  referenceId: z.string().trim().max(100).optional().nullable(),
});

function parseAdminEmails(value?: string): string[] {
  return value?.split(",").map((email) => email.trim()).filter(Boolean) ?? [];
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  try {
    const env = getEnv();
    const config = {
      supabaseUrl: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      adminEmails: parseAdminEmails(env.ADMIN_EMAILS),
      authorizationHeader: req.headers.authorization,
    };

    if (req.method === "GET") {
      const movements = await loadAdminInventoryMovements(config);
      res.status(200).json({ movements });
      return;
    }

    if (req.method === "POST") {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid inventory movement payload", details: parsed.error.flatten().fieldErrors });
        return;
      }

      const result = await recordAdminInventoryMovement(config, parsed.data);
      res.status(201).json(result);
      return;
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error instanceof AdminInventoryError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to handle inventory movement request";
    res.status(500).json({ error: message });
  }
}
