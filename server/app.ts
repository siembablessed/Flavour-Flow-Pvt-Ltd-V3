import crypto from "node:crypto";
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Paynow } from "paynow";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";
import { calculateCheckoutTotals } from "./catalog";

// Supabase admin client for server-side writes (bypasses RLS)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminDb: any = null;
function getAdminDb(): any {
  if (!_adminDb) {
    _adminDb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _adminDb;
}

const initiateSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+]{8,15}$/)
      .optional(),
    method: z.enum(["ecocash", "onemoney", "visa"]).optional(),
    userId: z.string().uuid().optional(),
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
    if (value.method && value.method !== "visa" && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Phone is required for mobile money payments",
      });
    }
  });

export type PaynowApiAppOptions = {
  enablePaymentStoreCleanup?: boolean;
};

function createPaynowClient(returnUrl: string): Paynow {
  const client = new Paynow(String(env.PAYNOW_INTEGRATION_ID), env.PAYNOW_INTEGRATION_KEY, env.PAYNOW_RESULT_URL, returnUrl);
  return client;
}

type PaymentState = {
  reference: string;
  amount: number;
  pollUrl: string;
  status: string;
  paid: boolean;
  updatedAt: number;
  orderNumber: string;
};

const paymentStore = new Map<string, PaymentState>();
const PAYMENT_STORE_TTL_MS = 24 * 60 * 60 * 1000;

function cleanupPaymentStore() {
  const now = Date.now();
  for (const [reference, state] of paymentStore) {
    if (now - state.updatedAt > PAYMENT_STORE_TTL_MS) {
      paymentStore.delete(reference);
    }
  }
}

function createReference(): string {
  return `WF-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function isPaidStatus(status: string | undefined): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "paid" || normalized === "awaiting delivery";
}

export function createPaynowApiApp(options: PaynowApiAppOptions = {}): Express {
  const { enablePaymentStoreCleanup = true } = options;

  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("CORS origin not allowed"));
      },
      methods: ["GET", "POST"],
      credentials: false,
    }),
  );

  app.post(
    "/api/payments/paynow/callback",
    express.raw({
      type: ["application/x-www-form-urlencoded", "application/json", "text/plain", "*/*"],
      limit: "32kb",
    }),
    (req, res) => {
      const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body ?? "").trim();

      if (!raw) {
        res.status(401).json({ error: "Invalid callback signature" });
        return;
      }

      const paynow = createPaynowClient(env.PAYNOW_RETURN_URL);

      let reference = "";
      let providerStatus = "unknown";

      try {
        const status = paynow.parseStatusUpdate(raw);
        reference = String(status.reference ?? "").trim();
        providerStatus = String(status.status ?? "unknown");
      } catch {
        res.status(401).json({ error: "Invalid callback signature" });
        return;
      }

      if (!reference) {
        res.status(400).json({ error: "Missing reference" });
        return;
      }

      const existing = paymentStore.get(reference);
      const paidNow = isPaidStatus(providerStatus);
      paymentStore.set(reference, {
        reference,
        amount: existing?.amount ?? 0,
        pollUrl: existing?.pollUrl ?? "",
        status: providerStatus,
        paid: paidNow,
        updatedAt: Date.now(),
        orderNumber: existing?.orderNumber ?? reference,
      });

      // Update Supabase asynchronously
      void (async () => {
        try {
          const db = getAdminDb();
          const { error: payErr } = await db
            .from("order_payments")
            .update({
              status: paidNow ? "paid" : "sent",
              provider_status: providerStatus,
              ...(paidNow && { paid_at: new Date().toISOString() }),
            })
            .eq("reference", reference);

          if (payErr) {
            console.error("[DB] Failed to update order_payment on callback:", payErr.message);
            return;
          }

          if (paidNow) {
            await db
              .from("orders")
              .update({ status: "paid", paid_at: new Date().toISOString() })
              .eq("payment_reference", reference);
          }
        } catch (dbErr) {
          console.error("[DB] Unexpected error on callback update:", dbErr);
        }
      })();

      res.status(200).json({ ok: true });
    },
  );

  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));

  const baseLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 150,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const checkoutLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(baseLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/payments/paynow/initiate", checkoutLimiter, async (req, res) => {
    const parsed = initiateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid payment payload",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { items, email, phone, method, userId } = parsed.data;

    let totals;
    try {
      totals = await calculateCheckoutTotals(items as import("./catalog").CartLineInput[]);
    } catch {
      res.status(400).json({ error: "Invalid cart items" });
      return;
    }

    const reference = createReference();
    const payerEmail = email ?? "customer@wholesale-connect.local";

    try {
      const returnSeparator = env.PAYNOW_RETURN_URL.includes("?") ? "&" : "?";
      const returnUrl = `${env.PAYNOW_RETURN_URL}${returnSeparator}reference=${encodeURIComponent(reference)}`;
      const paynow = createPaynowClient(returnUrl);

      const payment = paynow.createPayment(reference, payerEmail);
      payment.add(totals.description, totals.amount);

      const response =
        method && method !== "visa" ? await paynow.sendMobile(payment, String(phone ?? ""), method) : await paynow.send(payment);

      console.log(
        "[Paynow Initiate] init response",
        JSON.stringify({
          reference,
          method: method ?? "redirect",
          success: response?.success ?? false,
          hasPollUrl: Boolean(response?.pollUrl),
          hasRedirectUrl: Boolean(response?.redirectUrl),
          hasInstructions: Boolean(response?.instructions),
          error: response?.error ?? null,
        }),
      );

      if (!response?.success || !response.pollUrl) {
        res.status(502).json({ error: response?.error || "Unable to initialize Paynow payment" });
        return;
      }

      const mode = response.redirectUrl ? "redirect" : "mobile";

      if (mode === "redirect" && !response.redirectUrl) {
        res.status(502).json({ error: "Paynow did not provide a redirect URL" });
        return;
      }

      if (mode === "mobile" && !response.instructions) {
        res.status(502).json({ error: "Paynow did not provide mobile payment instructions" });
        return;
      }

      paymentStore.set(reference, {
        reference,
        amount: totals.amount,
        pollUrl: response.pollUrl,
        status: "sent",
        paid: false,
        updatedAt: Date.now(),
        orderNumber: reference,
      });

      // Persist to Supabase asynchronously (don't block the response)
      void (async () => {
        try {
          const db = getAdminDb();
          const { data: order, error: orderErr } = await db
            .from("orders")
            .insert({
              order_number: reference,
              customer_email: email ?? null,
              user_id: userId ?? null,
              subtotal: totals.amount,
              total: totals.amount,
              status: "pending_payment",
              payment_reference: reference,
            })
            .select("id")
            .single();

          if (orderErr || !order) {
            console.error("[DB] Failed to insert order:", orderErr?.message);
            return;
          }

          const { error: payErr } = await db.from("order_payments").insert({
            order_id: order.id,
            provider: "paynow",
            payment_method: method ?? "redirect",
            reference,
            poll_url: response.pollUrl,
            amount: totals.amount,
            status: "sent",
            provider_status: "sent",
          });

          if (payErr) {
            console.error("[DB] Failed to insert order_payment:", payErr.message);
          }
        } catch (dbErr) {
          console.error("[DB] Unexpected error persisting payment:", dbErr);
        }
      })();

      res.status(201).json({
        reference,
        orderNumber: reference,
        redirectUrl: response.redirectUrl ?? null,
        pollUrl: response.pollUrl,
        amount: totals.amount,
        instructions: response.instructions ?? null,
        mode,
      });
    } catch (error) {
      console.error("Paynow initiate error:", error);
      const message = error instanceof Error ? error.message : "Paynow request failed";
      res.status(502).json({ error: message });
    }
  });

  app.get("/api/payments/paynow/status/:reference", async (req, res) => {
    const reference = req.params.reference?.trim();
    if (!reference) {
      res.status(400).json({ error: "Missing reference" });
      return;
    }

    const state = paymentStore.get(reference);
    if (!state) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    try {
      if (state.pollUrl) {
        const paynow = createPaynowClient(env.PAYNOW_RETURN_URL);
        const poll = await paynow.pollTransaction(state.pollUrl);
        const paid = isPaidStatus(poll.status);

        paymentStore.set(reference, {
          ...state,
          status: poll.status,
          paid,
          updatedAt: Date.now(),
        });
      }
    } catch {
      // Keep latest cached state when Paynow poll fails.
    }

    const updated = paymentStore.get(reference)!;
    res.json({
      reference: updated.reference,
      orderNumber: updated.orderNumber,
      amount: updated.amount,
      status: updated.status,
      paid: updated.paid,
    });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  if (enablePaymentStoreCleanup) {
    const cleanupTimer = setInterval(cleanupPaymentStore, 60 * 60 * 1000);
    cleanupPaymentStore();
    cleanupTimer.unref?.();
  }

  return app;
}

export function __clearPaymentStoreForTests(): void {
  paymentStore.clear();
}
