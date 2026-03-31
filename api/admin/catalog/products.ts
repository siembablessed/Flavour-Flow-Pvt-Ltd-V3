import { z } from "zod";
import type { ApiRequest, ApiResponse } from "../../_lib/httpTypes.js";
import { getEnv } from "../../_lib/env.js";
import {
  AdminCatalogError,
  loadAdminProducts,
  loadAdminCategories,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  createAdminCategory,
} from "../../../shared/adminCatalog.js";

const productSchema = z.object({
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().trim().uuid(),
  pack: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(50),
  casePrice: z.number().positive(),
  unitPrice: z.number().positive(),
  unitPriceVat: z.number().positive(),
  isActive: z.boolean().optional(),
});

const productUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().trim().uuid().optional(),
  pack: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().min(1).max(50).optional(),
  casePrice: z.number().positive().optional(),
  unitPrice: z.number().positive().optional(),
  unitPriceVat: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

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

    // GET /api/admin/catalog/products - List products
    if (req.method === "GET") {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Number(req.query.offset) || 0;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      const result = await loadAdminProducts(config, limit, offset, search);
      res.status(200).json(result);
      return;
    }

    // POST /api/admin/catalog/products - Create product
    if (req.method === "POST") {
      const parsed = productSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid product payload", details: parsed.error.flatten().fieldErrors });
        return;
      }

      const result = await createAdminProduct(config, parsed.data);
      res.status(201).json(result);
      return;
    }

    // POST /api/admin/catalog/products?action=create-category - Create category
    if (req.method === "POST" && req.query.action === "create-category") {
      const parsed = categorySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid category payload", details: parsed.error.flatten().fieldErrors });
        return;
      }

      const result = await createAdminCategory(config, parsed.data.name);
      res.status(201).json(result);
      return;
    }

    // PUT /api/admin/catalog/products - Update product
    if (req.method === "PUT") {
      const productId = req.query.id;

      if (!productId) {
        res.status(400).json({ error: "Product ID required" });
        return;
      }

      const parsed = productUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid product payload", details: parsed.error.flatten().fieldErrors });
        return;
      }

      const result = await updateAdminProduct(config, productId, parsed.data);
      res.status(200).json(result);
      return;
    }

    // DELETE /api/admin/catalog/products - Delete product
    if (req.method === "DELETE") {
      const productId = req.query.id;

      if (!productId) {
        res.status(400).json({ error: "Product ID required" });
        return;
      }

      const result = await deleteAdminProduct(config, productId);
      res.status(200).json(result);
      return;
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error instanceof AdminCatalogError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to handle catalog request";
    res.status(500).json({ error: message });
  }
}