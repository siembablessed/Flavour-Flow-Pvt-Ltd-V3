import { describe, expect, it } from "vitest";
import { Paynow } from "paynow";
import { verifyPaynowHash } from "../../server/lib/paynowHash";

/**
 * Proves callback bodies must be hashed in Paynow SDK order (Object.keys), not alphabetical key order.
 */
describe("Paynow Zimbabwe SDK signature", () => {
  const integrationKey = "550e8400-e29b-41d4-a716-446655440000";
  const integrationId = "12345";
  const resultUrl = "https://merchant.example/api/payments/paynow/callback";
  const returnUrl = "https://merchant.example/payment/complete";

  function generateHashLikeSdk(paynow: Paynow, values: Record<string, string>, key: string): string {
    const proto = Paynow.prototype as unknown as { generateHash: (v: Record<string, string>, k: string) => string };
    return proto.generateHash.call(paynow, values, key);
  }

  it("parseStatusUpdate accepts a correctly signed callback body", () => {
    const paynow = new Paynow(integrationId, integrationKey, resultUrl, returnUrl);

    const fields: Record<string, string> = {
      reference: "WF-TEST-REF",
      amount: "199.50",
      paynowreference: "PN-998877",
      pollurl: "https://www.paynow.co.zw/interface/checkpayment/?guid=abc",
      status: "Paid",
    };

    const hash = generateHashLikeSdk(paynow, fields, integrationKey);
    const signed: Record<string, string> = { ...fields, hash };
    const rawBody = Object.entries(signed)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const update = paynow.parseStatusUpdate(rawBody);

    expect(String(update.reference)).toBe("WF-TEST-REF");
    expect(String(update.status).toLowerCase()).toBe("paid");
  });

  it("verifyPaynowHash matches the SDK when key order is preserved", () => {
    const paynow = new Paynow(integrationId, integrationKey, resultUrl, returnUrl);
    const fields: Record<string, string> = {
      reference: "WF-H",
      amount: "5",
      paynowreference: "PN",
      pollurl: "https://poll",
      status: "Sent",
    };
    const proto = Paynow.prototype as unknown as { generateHash: (v: Record<string, string>, k: string) => string };
    const hash = proto.generateHash.call(paynow, fields, integrationKey);
    const payload: Record<string, string> = { ...fields, hash };
    expect(verifyPaynowHash(payload, integrationKey)).toBe(true);
  });

  it("parseStatusUpdate rejects a tampered hash", () => {
    const paynow = new Paynow(integrationId, integrationKey, resultUrl, returnUrl);

    const fields: Record<string, string> = {
      reference: "WF-X",
      amount: "1",
      paynowreference: "PN",
      pollurl: "https://poll",
      status: "Paid",
    };

    const badHash = "0".repeat(128);
    const signed: Record<string, string> = { ...fields, hash: badHash };
    const rawBody = Object.entries(signed)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    expect(() => paynow.parseStatusUpdate(rawBody)).toThrow(/Hashes do not match/i);
  });
});
