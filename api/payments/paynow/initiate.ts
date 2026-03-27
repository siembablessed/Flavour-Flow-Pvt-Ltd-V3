import type { ApiRequest, ApiResponse } from "../../_lib/httpTypes.js";
import { z } from "zod";
import crypto from "node:crypto";
import { Paynow } from "paynow";
import { calculateCheckoutTotals } from "../../_lib/catalog.js";
import { getEnv } from "../../_lib/env.js";
import { serializeStateCookie } from "../../_lib/state.js";
import { createOrderWithPayment, markPaymentDispatched, markPaymentFailed } from "../../_lib/orders.js";

const initiateSchema = z
  .object({
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
  })
  .superRefine((value, ctx) => {
    if (value.method !== "visa" && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Phone number is required for mobile money methods",
      });
    }
  });

function createReference(): string {
  return `WF-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function createPaynowClient(returnUrl: string): Paynow {
  const env = getEnv();
  return new Paynow(
    String(env.PAYNOW_INTEGRATION_ID),
    env.PAYNOW_INTEGRATION_KEY,
    env.PAYNOW_RESULT_URL,
    returnUrl,
  );
}

async function safeMarkPaymentFailed(reference: string, reason: string): Promise<void> {
  try {
    await markPaymentFailed(reference, reason);
  } catch {
    // Prevent masking the original payment error.
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
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

    const originHeader = req.headers?.origin;
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

    const { items, email, method, phone } = parsed.data;
    const isExpressMobile = method === "ecocash" || method === "onemoney";

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

      if (phone) {
        payment.info = `Mobile ${phone}`;
      }

      const response = isExpressMobile
        ? await paynow.sendMobile(payment, phone ?? "", method)
        : await paynow.send(payment);

      if (!response?.success || !response.pollUrl || (!isExpressMobile && !response.redirectUrl)) {
        await safeMarkPaymentFailed(reference, "initiate_failed");
        res.status(502).json({ error: "Unable to initialize Paynow payment" });
        return;
      }

      try {
        await markPaymentDispatched(reference, String(response.pollUrl));
      } catch {
        await safeMarkPaymentFailed(reference, "dispatch_update_failed");
        res.status(500).json({ error: "Unable to finalize payment session" });
        return;
      }

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
        redirectUrl: response.redirectUrl ?? null,
        pollUrl: response.pollUrl,
        amount: totals.amount,
        instructions: response.instructions ?? null,
        mode: isExpressMobile ? "express" : "redirect",
      });
    } catch {
      await safeMarkPaymentFailed(reference, "paynow_request_failed");
      res.status(502).json({ error: "Paynow request failed" });
    }
  } catch {
    res.status(500).json({ error: "Unexpected payment server error" });
  }
}