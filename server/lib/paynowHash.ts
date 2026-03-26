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

export function verifyPaynowHash(payload: PaynowPayload, integrationKey: string): boolean {
  const receivedHash = (payload.hash || payload.Hash || "").trim();
  if (!receivedHash) {
    return false;
  }

  const content = Object.entries(payload)
    .filter(([key]) => key.toLowerCase() !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => (value ?? "").trim())
    .join("");

  const computed = crypto.createHash("md5").update(`${content}${integrationKey}`, "utf8").digest("hex");
  return safeEqual(computed.toUpperCase(), receivedHash.toUpperCase());
}
