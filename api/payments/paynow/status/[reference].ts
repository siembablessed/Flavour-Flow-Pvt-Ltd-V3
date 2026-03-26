import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Paynow } from "paynow";
import { clearStateCookie, readStateFromCookie } from "../../../_lib/state";
import { getEnv } from "../../../_lib/env";

function toPaynowStatus(status: string | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

function isPaidStatus(status: string | undefined): boolean {
  const normalized = toPaynowStatus(status);
  return normalized === "paid" || normalized === "awaiting delivery";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const reference = String(req.query.reference ?? "").trim();
  if (!reference) {
    res.status(400).json({ error: "Missing reference" });
    return;
  }

  const state = readStateFromCookie(req.headers.cookie, env.PAYNOW_COOKIE_SECRET);
  if (!state || state.reference !== reference) {
    res.status(404).json({ error: "Payment state not found" });
    return;
  }

  try {
    const paynow = new Paynow(env.PAYNOW_INTEGRATION_ID, env.PAYNOW_INTEGRATION_KEY, env.PAYNOW_RESULT_URL, env.PAYNOW_RETURN_URL);
    const poll = await paynow.pollTransaction(state.pollUrl);
    const status = String(poll?.status ?? "unknown");
    const paid = isPaidStatus(status);

    if (paid) {
      res.setHeader("Set-Cookie", clearStateCookie());
    }

    res.status(200).json({
      reference,
      amount: state.amount,
      status,
      paid,
    });
  } catch {
    res.status(502).json({ error: "Unable to poll Paynow transaction" });
  }
}

