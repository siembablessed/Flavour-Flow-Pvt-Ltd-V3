import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Paynow } from "paynow";
import { getEnv } from "../../../_lib/env";

async function readRawBody(req: VercelRequest): Promise<string> {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    res.status(200).json({
      ok: true,
      reference: status.reference,
      status: status.status,
      amount: status.amount,
    });
  } catch {
    res.status(401).json({ error: "Invalid callback signature" });
  }
}
