import type { ApiRequest, ApiResponse } from "../_lib/httpTypes.js";
import { z } from "zod";
import { getEnv } from "../_lib/env.js";
import { getAdminClient } from "../_lib/supabaseAdmin.js";
import { createAnonymousSessionId, readAnonymousSessionId, serializeAnonymousSessionCookie } from "../_lib/anonCart.js";

const payloadSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(50),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .max(200),
});

function ensureSessionId(req: ApiRequest, res: ApiResponse, secret: string, ttlSeconds: number): string {
  const cookieHeader = Array.isArray(req.headers.cookie) ? req.headers.cookie.join("; ") : req.headers.cookie;
  const existing = readAnonymousSessionId(cookieHeader, secret);
  if (existing) {
    return existing;
  }

  const sessionId = createAnonymousSessionId();
  res.setHeader("Set-Cookie", serializeAnonymousSessionCookie(sessionId, ttlSeconds, secret));
  return sessionId;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  let env;
  try {
    env = getEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment";
    res.status(500).json({ error: message });
    return;
  }

  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  if (origin && !env.allowedOrigins.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  const admin = getAdminClient();
  const ttlSeconds = env.ANON_CART_TTL_HOURS * 60 * 60;
  const expiresAtIso = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const sessionId = ensureSessionId(req, res, env.PAYNOW_COOKIE_SECRET, ttlSeconds);

  await admin.from("anonymous_cart_items").delete().lt("expires_at", new Date().toISOString());

  if (req.method === "GET") {
    const { data, error } = await admin
      .from("anonymous_cart_items")
      .select("product_id, quantity")
      .eq("session_id", sessionId)
      .gt("expires_at", new Date().toISOString());

    if (error) {
      res.status(500).json({ error: "Unable to load anonymous cart" });
      return;
    }

    res.status(200).json({
      items: (data ?? []).map((row) => ({ productId: row.product_id, quantity: Number(row.quantity) })),
    });
    return;
  }

  if (req.method === "PUT") {
    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid cart payload" });
      return;
    }

    const payload = parsed.data.items;

    const { data: existing } = await admin
      .from("anonymous_cart_items")
      .select("product_id")
      .eq("session_id", sessionId);

    const incomingIds = new Set(payload.map((item) => item.productId));
    const staleIds = (existing ?? [])
      .map((row) => String(row.product_id))
      .filter((id) => !incomingIds.has(id));

    if (staleIds.length > 0) {
      await admin
        .from("anonymous_cart_items")
        .delete()
        .eq("session_id", sessionId)
        .in("product_id", staleIds);
    }

    if (payload.length > 0) {
      const upsertRows = payload.map((item) => ({
        session_id: sessionId,
        product_id: item.productId,
        quantity: item.quantity,
        expires_at: expiresAtIso,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await admin
        .from("anonymous_cart_items")
        .upsert(upsertRows, { onConflict: "session_id,product_id" });

      if (error) {
        res.status(500).json({ error: "Unable to update anonymous cart" });
        return;
      }
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader("Allow", "GET, PUT");
  res.status(405).json({ error: "Method not allowed" });
}
