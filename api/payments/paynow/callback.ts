import type { ApiRequest, ApiResponse } from "../../../_lib/httpTypes";
import { Paynow } from "paynow";
import { getEnv } from "../../../_lib/env";
import { syncPaymentStatus } from "../../../_lib/orders";

async function readRawBody(req: ApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  const paynow = new Paynow(env.PAYNOW_INTEGRATION_ID, env.PAYNOW_INTEGRATION_KEY, env.PAYNOW_RESULT_URL, env.PAYNOW_RETURN_URL);

  try {
    const raw = await readRawBody(req);
    const status = paynow.parseStatusUpdate(raw);
    const reference = String(status.reference ?? "").trim();
    const providerStatus = String(status.status ?? "unknown");

    const sync = await syncPaymentStatus(reference, providerStatus);

    res.status(200).json({
      ok: true,
      reference,
      orderNumber: sync.orderNumber,
      status: providerStatus,
      amount: sync.amount,
      paid: sync.paid,
    });
  } catch {
    res.status(401).json({ error: "Invalid callback signature" });
  }
}
