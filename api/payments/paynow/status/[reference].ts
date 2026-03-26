import type { ApiRequest, ApiResponse } from "../../../_lib/httpTypes";
import { Paynow } from "paynow";
import { clearStateCookie, readStateFromCookie } from "../../../_lib/state";
import { getEnv } from "../../../_lib/env";
import { getOrderByReference, syncPaymentStatus } from "../../../_lib/orders";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

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

  const reference = String(req.query.reference ?? "").trim();
  if (!reference) {
    res.status(400).json({ error: "Missing reference" });
    return;
  }

  const cookieHeader = Array.isArray(req.headers.cookie) ? req.headers.cookie.join("; ") : req.headers.cookie;
  const state = readStateFromCookie(cookieHeader, env.PAYNOW_COOKIE_SECRET);
  if (!state || state.reference !== reference) {
    const fallback = await getOrderByReference(reference);
    if (!fallback.orderNumber) {
      res.status(404).json({ error: "Payment state not found" });
      return;
    }

    res.status(409).json({ error: "Payment session expired. Please refresh your order status." });
    return;
  }

  try {
    const paynow = new Paynow(env.PAYNOW_INTEGRATION_ID, env.PAYNOW_INTEGRATION_KEY, env.PAYNOW_RESULT_URL, env.PAYNOW_RETURN_URL);
    const poll = await paynow.pollTransaction(state.pollUrl);
    const providerStatus = String(poll?.status ?? "unknown");

    const sync = await syncPaymentStatus(reference, providerStatus);

    if (sync.paid) {
      res.setHeader("Set-Cookie", clearStateCookie());
    }

    res.status(200).json({
      reference,
      orderNumber: sync.orderNumber ?? state.orderNumber,
      amount: sync.amount ?? state.amount,
      status: sync.status,
      paid: sync.paid,
    });
  } catch {
    res.status(502).json({ error: "Unable to poll Paynow transaction" });
  }
}


