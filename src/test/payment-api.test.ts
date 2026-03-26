import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRequest, ApiResponse } from "../../api/_lib/httpTypes";

const mockCreateOrderWithPayment = vi.fn();
const mockMarkPaymentDispatched = vi.fn();
const mockMarkPaymentFailed = vi.fn();
const mockSyncPaymentStatus = vi.fn();
const mockCalculateCheckoutTotals = vi.fn();
const mockSerializeStateCookie = vi.fn();
const mockGetEnv = vi.fn();

const mockCreatePayment = vi.fn();
const mockSend = vi.fn();
const mockParseStatusUpdate = vi.fn();

vi.mock("../../api/_lib/orders", () => ({
  createOrderWithPayment: mockCreateOrderWithPayment,
  markPaymentDispatched: mockMarkPaymentDispatched,
  markPaymentFailed: mockMarkPaymentFailed,
  syncPaymentStatus: mockSyncPaymentStatus,
}));

vi.mock("../../api/_lib/catalog", () => ({
  calculateCheckoutTotals: mockCalculateCheckoutTotals,
}));

vi.mock("../../api/_lib/state", () => ({
  serializeStateCookie: mockSerializeStateCookie,
}));

vi.mock("../../api/_lib/env", () => ({
  getEnv: mockGetEnv,
}));

vi.mock("paynow", () => ({
  Paynow: vi.fn().mockImplementation(() => ({
    createPayment: mockCreatePayment,
    send: mockSend,
    parseStatusUpdate: mockParseStatusUpdate,
  })),
}));

function createMockResponse() {
  const headers: Record<string, string | string[]> = {};
  let statusCode = 200;
  let body: unknown = undefined;

  const res: ApiResponse = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
    },
    setHeader(name: string, value: string | string[]) {
      headers[name] = value;
    },
  };

  return {
    res,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    headers,
  };
}

function makePostRequest(body: unknown): ApiRequest {
  return {
    method: "POST",
    headers: { origin: "https://flavourflows.com" },
    query: {},
    body,
    async *[Symbol.asyncIterator]() {},
  };
}

function makeRawPostRequest(rawBody: string): ApiRequest {
  return {
    method: "POST",
    headers: {},
    query: {},
    async *[Symbol.asyncIterator]() {
      yield rawBody;
    },
  };
}

describe("payment api handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetEnv.mockReturnValue({
      PAYNOW_INTEGRATION_ID: "id",
      PAYNOW_INTEGRATION_KEY: "key",
      PAYNOW_RESULT_URL: "https://flavourflows.com/api/payments/paynow/callback",
      PAYNOW_RETURN_URL: "https://flavourflows.com/payment/complete",
      PAYNOW_COOKIE_SECRET: "1234567890123456",
      allowedOrigins: ["https://flavourflows.com"],
    });

    mockCalculateCheckoutTotals.mockResolvedValue({
      amount: 120,
      description: "Wholesale order",
      lines: [
        {
          productId: "prod-1",
          name: "Product",
          pack: "12 x 750ml",
          casePrice: 120,
          quantity: 1,
          lineTotal: 120,
        },
      ],
    });

    mockCreateOrderWithPayment.mockResolvedValue({
      orderId: "order-1",
      orderNumber: "WF-TEST-1",
    });
    mockMarkPaymentDispatched.mockResolvedValue(undefined);
    mockMarkPaymentFailed.mockResolvedValue(undefined);
    mockSerializeStateCookie.mockReturnValue("paynow_state=token");

    mockSend.mockResolvedValue({
      success: true,
      pollUrl: "https://poll",
      redirectUrl: "https://redirect",
    });
  });

  it("forwards phone metadata during payment initiation", async () => {
    const paymentPayload: { add: ReturnType<typeof vi.fn>; info?: string } = { add: vi.fn() };
    mockCreatePayment.mockReturnValue(paymentPayload);

    const { default: initiateHandler } = await import("../../api/payments/paynow/initiate");
    const req = makePostRequest({
      method: "ecocash",
      phone: "0771234567",
      items: [{ id: "prod-1", quantity: 1 }],
    });
    const response = createMockResponse();

    await initiateHandler(req, response.res);

    expect(response.statusCode).toBe(201);
    expect(paymentPayload.info).toBe("Mobile 0771234567");
  });

  it("returns 401 when callback signature parsing fails", async () => {
    mockParseStatusUpdate.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const { default: callbackHandler } = await import("../../api/payments/paynow/callback");
    const req = makeRawPostRequest("invalid=1");
    const response = createMockResponse();

    await callbackHandler(req, response.res);

    expect(response.statusCode).toBe(401);
  });

  it("returns 400 when callback payload has no reference", async () => {
    mockParseStatusUpdate.mockReturnValue({ status: "Paid" });

    const { default: callbackHandler } = await import("../../api/payments/paynow/callback");
    const req = makeRawPostRequest("status=Paid");
    const response = createMockResponse();

    await callbackHandler(req, response.res);

    expect(response.statusCode).toBe(400);
  });

  it("returns 500 when callback persistence fails", async () => {
    mockParseStatusUpdate.mockReturnValue({ reference: "WF-TEST-1", status: "Paid" });
    mockSyncPaymentStatus.mockRejectedValue(new Error("db down"));

    const { default: callbackHandler } = await import("../../api/payments/paynow/callback");
    const req = makeRawPostRequest("reference=WF-TEST-1&status=Paid");
    const response = createMockResponse();

    await callbackHandler(req, response.res);

    expect(response.statusCode).toBe(500);
  });
});