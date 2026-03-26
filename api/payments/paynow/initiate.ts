import type { ApiRequest, ApiResponse } from "../../../_lib/httpTypes";
import { z } from "zod";
import crypto from "node:crypto";
import { Paynow } from "paynow";
import { calculateCheckoutTotals } from "../../../_lib/catalog";
import { getEnv } from "../../../_lib/env";
import { serializeStateCookie } from "../../../_lib/state";
import { createOrderWithPayment, markPaymentDispatched, markPaymentFailed } from "../../../_lib/orders";

const initiateSchema = z.object({
  email: z.string().email().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+]{8,15}$/)
    .optional(),
  method: z.enum(["ecocash", "onemoney", "visa"]),
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(50),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(200),
});

function createReference(): string {
  return `WF-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function createPaynowClient(returnUrl: string): Paynow {
  const env = getEnv();
  return new Paynow(env.PAYNOW_INTEGRATION_ID, env.PAYNOW_INTEGRATION_KEY, env.PAYNOW_RESULT_URL, returnUrl);
}

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

  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  if (origin && !env.allowedOrigins.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  const parsed = initiateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid payment payload",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { items, email, method } = parsed.data;

  let totals;
  try {
    totals = await calculateCheckoutTotals(items);
  } catch {
    res.status(400).json({ error: "Invalid cart items" });
    return;
  }

  const reference = createReference();
  const payerEmail = email ?? "customer@flavourflows.com";

  let createdOrder;
  try {
    createdOrder = await createOrderWithPayment({
      reference,
      customerEmail: payerEmail,
      paymentMethod: method,
      totals,
    });
  } catch {
    res.status(500).json({ error: "Unable to create order" });
    return;
  }

  try {
    const returnSeparator = env.PAYNOW_RETURN_URL.includes("?") ? "&" : "?";
    const returnUrl = `${env.PAYNOW_RETURN_URL}${returnSeparator}reference=${encodeURIComponent(reference)}`;
    const paynow = createPaynowClient(returnUrl);

    const payment = paynow.createPayment(reference, payerEmail);
    payment.add(totals.description, totals.amount);

    const response = await paynow.send(payment);
    if (!response?.success || !response.pollUrl || !response.redirectUrl) {
      await markPaymentFailed(reference, "initiate_failed");
      res.status(502).json({ error: "Unable to initialize Paynow payment" });
      return;
    }

    await markPaymentDispatched(reference, String(response.pollUrl));

    const stateCookie = serializeStateCookie(
      {
        reference,
        pollUrl: String(response.pollUrl),
        amount: totals.amount,
        orderNumber: createdOrder.orderNumber,
        exp: Date.now() + 2 * 60 * 60 * 1000,
      },
      env.PAYNOW_COOKIE_SECRET,
    );

    res.setHeader("Set-Cookie", stateCookie);
    res.status(201).json({
      reference,
      orderNumber: createdOrder.orderNumber,
      redirectUrl: response.redirectUrl,
      pollUrl: response.pollUrl,
      amount: totals.amount,
    });
  } catch {
    await markPaymentFailed(reference, "paynow_request_failed");
    res.status(502).json({ error: "Paynow request failed" });
  }
}
