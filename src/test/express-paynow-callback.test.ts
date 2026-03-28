import request from "supertest";
import { Paynow } from "paynow";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Express } from "express";

vi.mock("../../server/catalog", () => ({
  calculateCheckoutTotals: vi.fn().mockResolvedValue({ amount: 1, description: "Test" }),
}));

function setServerTestEnv(): void {
  process.env.NODE_ENV = "test";
  process.env.PORT = "8787";
  process.env.PAYNOW_INTEGRATION_ID = "test-integration-id";
  process.env.PAYNOW_INTEGRATION_KEY = "550e8400-e29b-41d4-a716-446655440000";
  process.env.PAYNOW_RESULT_URL = "https://merchant.example/api/payments/paynow/callback";
  process.env.PAYNOW_RETURN_URL = "https://merchant.example/payment/complete";
  process.env.FRONTEND_URL = "http://localhost:8080";
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
}

/**
 * Separate file so `paynow` is not mocked (Vitest hoists vi.mock from other test files per file scope).
 */
describe("Express Paynow callback with real SDK", () => {
  let app: Express;
  let clearStore: typeof import("../../server/app").__clearPaymentStoreForTests;

  beforeAll(async () => {
    setServerTestEnv();
    vi.resetModules();
    const mod = await import("../../server/app");
    app = mod.createPaynowApiApp({ enablePaymentStoreCleanup: false });
    clearStore = mod.__clearPaymentStoreForTests;
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  beforeEach(() => {
    clearStore();
  });

  it("returns 200 for a valid Paynow-signed application/x-www-form-urlencoded body", async () => {
    const key = process.env.PAYNOW_INTEGRATION_KEY!;
    const id = process.env.PAYNOW_INTEGRATION_ID!;
    const resultUrl = process.env.PAYNOW_RESULT_URL!;
    const returnUrl = process.env.PAYNOW_RETURN_URL!;

    const paynow = new Paynow(id, key, resultUrl, returnUrl);
    const fields: Record<string, string> = {
      reference: "WF-CALLBACK-1",
      amount: "42.00",
      paynowreference: "PN-ZW-1",
      pollurl: "https://www.paynow.co.zw/interface/checkpayment/?g=1",
      status: "Paid",
    };
    const proto = Paynow.prototype as unknown as { generateHash: (v: Record<string, string>, k: string) => string };
    const hash = proto.generateHash.call(paynow, fields, key);
    const signed: Record<string, string> = { ...fields, hash };
    const rawBody = Object.entries(signed)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const res = await request(app)
      .post("/api/payments/paynow/callback")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("returns 401 for an invalid hash", async () => {
    const res = await request(app)
      .post("/api/payments/paynow/callback")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send("reference=WF-1&amount=1&status=Paid&hash=deadbeef");

    expect(res.status).toBe(401);
  });
});
