import { z } from "zod";
import type { ApiRequest, ApiResponse } from "../../_lib/httpTypes.js";
import { getEnv } from "../../_lib/env.js";
import {
  AdminCatalogError,
  loadAdminCategories,
  createAdminCategory,
} from "../../../shared/adminCatalog.js";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
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

    // GET /api/admin/catalog/categories - List categories
    if (req.method === "GET") {
      const result = await loadAdminCategories(config);
      res.status(200).json({ categories: result });
      return;
    }

    // POST /api/admin/catalog/categories - Create category
    if (req.method === "POST") {
      const parsed = categorySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid category payload", details: parsed.error.flatten().fieldErrors });
        return;
      }

      const result = await createAdminCategory(config, parsed.data.name);
      res.status(201).json(result);
      return;
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error instanceof AdminCatalogError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to handle category request";
    res.status(500).json({ error: message });
  }
}