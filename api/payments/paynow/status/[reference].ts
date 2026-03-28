import type { ApiRequest, ApiResponse } from "../../../_lib/httpTypes.js";
import { Paynow } from "paynow";
import { clearStateCookie, readStateFromCookie } from "../../../_lib/state.js";
import { getEnv } from "../../../_lib/env.js";
import { getPaynowPaymentContextByReference, syncPaymentStatus } from "../../../_lib/orders.js";

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

  let pollUrl: string | null = null;
  let cookieOrderNumber: string | undefined;
  let cookieAmount: number | undefined;

  if (state && state.reference === reference) {
    pollUrl = state.pollUrl;
    cookieOrderNumber = state.orderNumber;
    cookieAmount = state.amount;
  } else {
    const fallback = await getPaynowPaymentContextByReference(reference);
    if (!fallback.orderNumber) {
      res.status(404).json({ error: "Payment state not found" });
      return;
    }

    if (!fallback.pollUrl) {
      res.status(409).json({ error: "Payment session expired. Please refresh your order status." });
      return;
    }

    pollUrl = fallback.pollUrl;
    cookieOrderNumber = fallback.orderNumber ?? undefined;
    cookieAmount = fallback.amount ?? undefined;
  }

  try {
    const paynow = new Paynow(
      String(env.PAYNOW_INTEGRATION_ID),
      env.PAYNOW_INTEGRATION_KEY,
      env.PAYNOW_RESULT_URL,
      env.PAYNOW_RETURN_URL,
    );
    console.log("[Paynow Status] Polling transaction from:", pollUrl);
    const poll = await paynow.pollTransaction(pollUrl);
    console.log("[Paynow Status] Poll response:", JSON.stringify(poll));
    const providerStatus = String(poll?.status ?? "unknown");

    const sync = await syncPaymentStatus(reference, providerStatus);

    if (sync.paid && state && state.reference === reference) {
      res.setHeader("Set-Cookie", clearStateCookie());
    }

    res.status(200).json({
      reference,
      orderNumber: sync.orderNumber ?? cookieOrderNumber ?? null,
      amount: Number(sync.amount ?? cookieAmount ?? 0),
      status: sync.status,
      paid: sync.paid,
    });
  } catch {
    res.status(502).json({ error: "Unable to poll Paynow transaction" });
  }
}



