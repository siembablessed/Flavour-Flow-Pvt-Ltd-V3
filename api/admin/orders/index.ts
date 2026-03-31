import { z } from "zod";
import type { ApiRequest, ApiResponse } from "../../_lib/httpTypes.js";
import { getEnv } from "../../_lib/env.js";
import {
  AdminOrdersError,
  loadAdminOrders,
  loadAdminOrderDetail,
  updateAdminOrderStatus,
  exportOrdersToCsv,
  type OrderStatus,
} from "../../../shared/adminOrders.js";

const updateStatusSchema = z.object({
  status: z.enum(["pending_payment", "paid", "payment_failed", "cancelled", "fulfilled"]),
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

    // GET /api/admin/orders - List orders
    if (req.method === "GET") {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Number(req.query.offset) || 0;
      const status = typeof req.query.status === "string" ? req.query.status as OrderStatus : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;

      // Export to CSV
      if (req.query.export === "csv") {
        const result = await loadAdminOrders(config, 1000, 0, status, search, startDate, endDate);
        const csv = exportOrdersToCsv(result.orders);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
        res.status(200).send(csv);
        return;
      }

      const result = await loadAdminOrders(config, limit, offset, status, search, startDate, endDate);
      res.status(200).json(result);
      return;
    }

    // PUT /api/admin/orders - Update order status
    if (req.method === "PUT") {
      const orderId = req.query.id;

      if (!orderId || typeof orderId !== "string") {
        res.status(400).json({ error: "Order ID required" });
        return;
      }

      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid status payload", details: parsed.error.flatten().fieldErrors });
        return;
      }

      const result = await updateAdminOrderStatus(config, orderId, parsed.data.status);
      res.status(200).json(result);
      return;
    }

    // GET /api/admin/orders?id=xxx - Get order detail
    if (req.method === "GET" && req.query.id) {
      const orderId = req.query.id;

      if (!orderId || typeof orderId !== "string") {
        res.status(400).json({ error: "Order ID required" });
        return;
      }

      const result = await loadAdminOrderDetail(config, orderId);
      res.status(200).json(result);
      return;
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error instanceof AdminOrdersError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to handle order request";
    res.status(500).json({ error: message });
  }
}