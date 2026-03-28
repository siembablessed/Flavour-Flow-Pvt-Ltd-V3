import crypto from "node:crypto";

type PaynowPayload = Record<string, string | undefined>;

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Verifies Paynow callback hash using the same field order as the official SDK
 * (`Object.keys` insertion order), not alphabetical sorting.
 */
export function verifyPaynowHash(payload: PaynowPayload, integrationKey: string): boolean {
  const receivedHash = (payload.hash || payload.Hash || "").trim();
  if (!receivedHash) {
    return false;
  }

  let string = "";
  for (const key of Object.keys(payload)) {
    if (key.toLowerCase() === "hash") {
      continue;
    }
    string += (payload[key] ?? "").toString();
  }
  string += integrationKey.toLowerCase();

  const computed = crypto.createHash("sha512").update(string, "utf8").digest("hex");
  return safeEqual(computed.toUpperCase(), receivedHash.toUpperCase());
}
