import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Express } from "express";

const catalogMock = vi.hoisted(() => ({
  calculateCheckoutTotals: vi.fn(),
}));

vi.mock("../../server/catalog", () => ({
  calculateCheckoutTotals: catalogMock.calculateCheckoutTotals,
}));

const paynowMock = vi.hoisted(() => {
  const add = vi.fn();
  const createPayment = vi.fn(() => ({ add }));
  const send = vi.fn();
  const sendMobile = vi.fn();
  const parseStatusUpdate = vi.fn();
  const pollTransaction = vi.fn();
  const Paynow = vi.fn().mockImplementation(() => ({
    createPayment,
    send,
    sendMobile,
    parseStatusUpdate,
    pollTransaction,
  }));
  return { Paynow, createPayment, send, sendMobile, parseStatusUpdate, pollTransaction, add };
});

vi.mock("paynow", () => ({
  Paynow: paynowMock.Paynow,
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

describe("Express Paynow API (local dev server)", () => {
  let app: Express;
  let createPaynowApiApp: typeof import("../../server/app").createPaynowApiApp;
  let clearStore: typeof import("../../server/app").__clearPaymentStoreForTests;

  beforeAll(async () => {
    setServerTestEnv();
    vi.resetModules();
    const mod = await import("../../server/app");
    createPaynowApiApp = mod.createPaynowApiApp;
    clearStore = mod.__clearPaymentStoreForTests;
    app = createPaynowApiApp({ enablePaymentStoreCleanup: false });
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  beforeEach(() => {
    clearStore();
    vi.clearAllMocks();
    catalogMock.calculateCheckoutTotals.mockResolvedValue({
      amount: 42,
      description: "Wholesale order",
    });
    paynowMock.send.mockResolvedValue({
      success: true,
      pollUrl: "https://www.paynow.co.zw/poll/test",
      redirectUrl: "https://www.paynow.co.zw/checkout/test",
    });
    paynowMock.sendMobile.mockResolvedValue({
      success: true,
      pollUrl: "https://www.paynow.co.zw/poll/m",
      instructions: "Approve the EcoCash prompt on your phone.",
    });
    paynowMock.parseStatusUpdate.mockImplementation(() => {
      throw new Error("parseStatusUpdate not used in these tests");
    });
  });

  it("accepts initiate with items only (hosted redirect) and calls send()", async () => {
    const res = await request(app)
      .post("/api/payments/paynow/initiate")
      .set("Content-Type", "application/json")
      .send({ items: [{ id: "prod-1", quantity: 1 }] });

    expect(res.status).toBe(201);
    expect(paynowMock.send).toHaveBeenCalledTimes(1);
    expect(paynowMock.sendMobile).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      mode: "redirect",
      redirectUrl: "https://www.paynow.co.zw/checkout/test",
      pollUrl: "https://www.paynow.co.zw/poll/test",
    });
  });

  it("requires phone for ecocash", async () => {
    const res = await request(app)
      .post("/api/payments/paynow/initiate")
      .set("Content-Type", "application/json")
      .send({ items: [{ id: "prod-1", quantity: 1 }], method: "ecocash" });

    expect(res.status).toBe(400);
    expect(res.body.details?.phone).toBeDefined();
    expect(paynowMock.send).not.toHaveBeenCalled();
  });

  it("uses sendMobile for ecocash when phone is present", async () => {
    const res = await request(app)
      .post("/api/payments/paynow/initiate")
      .set("Content-Type", "application/json")
      .send({
        items: [{ id: "prod-1", quantity: 1 }],
        method: "ecocash",
        phone: "0777000000",
      });

    expect(res.status).toBe(201);
    expect(paynowMock.sendMobile).toHaveBeenCalledTimes(1);
    expect(paynowMock.send).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      mode: "mobile",
      instructions: "Approve the EcoCash prompt on your phone.",
    });
  });
});
