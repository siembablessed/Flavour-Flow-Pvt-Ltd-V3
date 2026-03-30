import crypto from "node:crypto";
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Paynow } from "paynow";
import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import { calculateCheckoutTotals } from "./catalog";
import { AdminAccessError, loadAdminDashboard } from "../shared/adminDashboard";
import {
  AdminInventoryError,
  loadAdminInventoryMovements,
  recordAdminInventoryMovement,
  updateAdminReorderLevel,
} from "../shared/adminInventory";

// ---------------------------------------------------------------------------
// Supabase admin client (bypasses RLS)
// ---------------------------------------------------------------------------
let _adminDb: SupabaseClient | null = null;
function getAdminDb(): SupabaseClient {
  if (!_adminDb) {
    _adminDb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _adminDb;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const initiateSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+]{8,15}$/)
      .optional(),
    // token is used by Zimswitch (32-char hex token) instead of a phone number
    token: z.string().trim().min(1).max(64).optional(),
    method: z
      .enum(["ecocash", "onemoney", "zimswitch", "innbucks", "omari", "vmc"])
      .optional(),
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
    // Methods that require a phone number
    const PHONE_METHODS = ["ecocash", "onemoney", "omari", "innbucks"] as const;
    // Methods that require a card / wallet token instead of a phone
    const TOKEN_METHODS = ["zimswitch"] as const;

    if (value.method && (PHONE_METHODS as readonly string[]).includes(value.method) && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Phone is required for mobile money payments",
      });
    }
    if (value.method && (TOKEN_METHODS as readonly string[]).includes(value.method) && !value.token) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["token"],
        message: "Token is required for this payment method",
      });
    }
  });

const inventoryMovementSchema = z.object({
  movementType: z.enum(["stock_in", "stock_out", "reserve", "release", "adjustment_plus", "adjustment_minus"]),
  productId: z.string().trim().min(1).max(50),
  locationCode: z.string().trim().min(1).max(50),
  quantityCases: z.number().positive(),
  note: z.string().trim().max(500).optional().nullable(),
  referenceType: z.string().trim().max(100).optional().nullable(),
  referenceId: z.string().trim().max(100).optional().nullable(),
});

const reorderLevelSchema = z.object({
  productId: z.string().trim().min(1).max(50),
  locationCode: z.string().trim().min(1).max(50),
  reorderLevelCases: z.number().min(0),
});

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------
export type PaynowApiAppOptions = {
  enablePaymentStoreCleanup?: boolean;
};

function createPaynowClient(returnUrl: string): Paynow {
  return new Paynow(
    String(env.PAYNOW_INTEGRATION_ID),
    env.PAYNOW_INTEGRATION_KEY,
    env.PAYNOW_RESULT_URL,
    returnUrl,
  );
}

type PaymentState = {
  reference: string;
  amount: number;
  pollUrl: string;
  status: string;
  paid: boolean;
  updatedAt: number;
  orderNumber: string;
  omariRemoteOtpUrl?: string; // stored so the omari-otp endpoint can relay the OTP
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

// ---------------------------------------------------------------------------
// Dispatch helper — decides which Paynow method to call
// ---------------------------------------------------------------------------
const PHONE_METHODS = ["ecocash", "onemoney", "omari", "innbucks"];
const TOKEN_METHODS = ["zimswitch"];

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------
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

  // Paynow callback must receive raw body BEFORE express.json() middleware
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

  // ── Health ──────────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // ── Admin: Dashboard ────────────────────────────────────────────────────
  app.get("/api/admin/dashboard", async (req, res) => {
    try {
      const payload = await loadAdminDashboard({
        supabaseUrl: env.SUPABASE_URL,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
        adminEmails: env.ADMIN_EMAILS?.split(",").map((email) => email.trim()).filter(Boolean) ?? [],
        authorizationHeader: req.headers.authorization,
      });

      res.json(payload);
    } catch (error) {
      if (error instanceof AdminAccessError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      const message = error instanceof Error ? error.message : "Unable to load admin dashboard";
      res.status(500).json({ error: message });
    }
  });

  // ── Admin: Inventory movements ──────────────────────────────────────────
  app.get("/api/admin/inventory/movements", async (req, res) => {
    try {
      const payload = await loadAdminInventoryMovements({
        supabaseUrl: env.SUPABASE_URL,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
        adminEmails: env.ADMIN_EMAILS?.split(",").map((email) => email.trim()).filter(Boolean) ?? [],
        authorizationHeader: req.headers.authorization,
      });

      res.json({ movements: payload });
    } catch (error) {
      if (error instanceof AdminInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      const message = error instanceof Error ? error.message : "Unable to load inventory movements";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/admin/inventory/movements", async (req, res) => {
    const parsed = inventoryMovementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid inventory movement payload",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const result = await recordAdminInventoryMovement(
        {
          supabaseUrl: env.SUPABASE_URL,
          serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
          adminEmails: env.ADMIN_EMAILS?.split(",").map((email) => email.trim()).filter(Boolean) ?? [],
          authorizationHeader: req.headers.authorization,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsed.data as any,
      );

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof AdminInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      const message = error instanceof Error ? error.message : "Unable to record inventory movement";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/admin/inventory/reorder-level", async (req, res) => {
    const parsed = reorderLevelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid reorder level payload",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const result = await updateAdminReorderLevel(
        {
          supabaseUrl: env.SUPABASE_URL,
          serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
          adminEmails: env.ADMIN_EMAILS?.split(",").map((email) => email.trim()).filter(Boolean) ?? [],
          authorizationHeader: req.headers.authorization,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsed.data as any,
      );

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof AdminInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      const message = error instanceof Error ? error.message : "Unable to update reorder level";
      res.status(500).json({ error: message });
    }
  });

  // ── Payments: Initiate ──────────────────────────────────────────────────
  app.post("/api/payments/paynow/initiate", checkoutLimiter, async (req, res) => {
    const parsed = initiateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid payment payload",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { items, email, phone, token, method, userId } = parsed.data;

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

      let response;
      if (method && PHONE_METHODS.includes(method)) {
        // EcoCash, OneMoney, Omari, InnBucks — push USSD to phone
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response = await paynow.sendMobile(payment, String(phone ?? ""), method as any);
      } else if (method && TOKEN_METHODS.includes(method)) {
        // Zimswitch — send 32-char card token in the "phone" field per Paynow API docs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response = await paynow.sendMobile(payment, String(token ?? ""), method as any);
      } else {
        // VMC (Visa/Mastercard) and default — web redirect; Paynow hosts the card form
        response = await paynow.send(payment);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawForLog = response as any;
      console.log(
        "[Paynow Initiate] init response",
        JSON.stringify({
          reference,
          method: method ?? "redirect",
          success: response?.success ?? false,
          hasPollUrl: Boolean(response?.pollUrl),
          hasRedirectUrl: Boolean(response?.redirectUrl),
          hasInstructions: Boolean(response?.instructions),
          isInnbucks: rawForLog?.isInnbucks ?? false,
          innbucksCode: rawForLog?.innbucks_info?.[0]?.authorizationcode ?? null,
          innbucksExpires: rawForLog?.innbucks_info?.[0]?.expires_at ?? null,
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

      // InnBucks and O'mari have non-standard responses — only EcoCash/OneMoney send `instructions`
      // Omari triggers an SMS OTP; InnBucks uses an auth code. Neither has a USSD instructions string.
      const isInnbucks = response.isInnbucks === true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawRes = response as any;
      const isOmari = method === "omari";
      const omariOtpReference: string | null = isOmari ? (rawRes.otpreference ?? null) : null;
      const omariRemoteOtpUrl: string | null = isOmari ? (rawRes.remoteotpurl ?? null) : null;

      // Only block if it's a plain mobile method that MUST have instructions (EcoCash / OneMoney / Zimswitch)
      const requiresInstructions = ["ecocash", "onemoney", "zimswitch"].includes(method ?? "");
      if (mode === "mobile" && requiresInstructions && !response.instructions) {
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
        ...(omariRemoteOtpUrl && { omariRemoteOtpUrl }),
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

      // InnBucks info
      const innbucksInfo = isInnbucks && response.innbucks_info?.length
        ? response.innbucks_info[0]
        : null;

      res.status(201).json({
        reference,
        orderNumber: reference,
        redirectUrl: response.redirectUrl ?? null,
        pollUrl: response.pollUrl,
        amount: totals.amount,
        instructions: response.instructions ?? null,
        mode,
        // O'mari OTP fields
        omariOtpReference,
        omariRemoteOtpUrl,
        // InnBucks auth code fields
        innbucksCode: innbucksInfo?.authorizationcode ?? null,
        innbucksDeepLink: innbucksInfo?.deep_link_url ?? null,
        innbucksQr: innbucksInfo?.qr_code ?? null,
        innbucksExpiresAt: innbucksInfo?.expires_at ?? null,
      });
    } catch (error) {
      console.error("Paynow initiate error:", error);
      const message = error instanceof Error ? error.message : "Paynow request failed";
      res.status(502).json({ error: message });
    }
  });

  // ── Payments: Poll status ───────────────────────────────────────────────
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

  // ── Payments: O'mari OTP completion ────────────────────────────────────
  app.post("/api/payments/paynow/omari-otp", checkoutLimiter, async (req, res) => {
    const { reference, otp } = req.body as { reference?: string; otp?: string };

    if (!reference || !otp) {
      res.status(400).json({ error: "reference and otp are required" });
      return;
    }

    const state = paymentStore.get(reference.trim());
    if (!state) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    if (!state.omariRemoteOtpUrl) {
      res.status(400).json({ error: "No O'mari OTP URL stored for this payment" });
      return;
    }

    try {
      // Build the hash for the OTP submission per Paynow docs.
      // generateHash and parseQuery exist on the class at runtime but are not in the public TS type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paynowAny = createPaynowClient(env.PAYNOW_RETURN_URL) as any;
      const hashValues: Record<string, string> = {
        id: String(env.PAYNOW_INTEGRATION_ID),
        otp: otp.trim(),
        status: "Message",
      };
      hashValues.hash = paynowAny.generateHash(hashValues, env.PAYNOW_INTEGRATION_KEY);

      const body = new URLSearchParams(hashValues).toString();

      const otpResponse = await fetch(state.omariRemoteOtpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const raw = await otpResponse.text();
      console.log("[Omari OTP] raw response:", raw);

      // Parse the URL-encoded response
      const parsed = paynowAny.parseQuery(raw) as Record<string, string>;
      const status = (parsed.status ?? "").toLowerCase();

      if (status === "error") {
        res.status(400).json({ ok: false, status: "error", paid: false, error: parsed.error ?? "OTP failed" });
        return;
      }

      const paid = isPaidStatus(parsed.status);
      paymentStore.set(reference, { ...state, status: parsed.status, paid, updatedAt: Date.now() });

      // Update Supabase
      void (async () => {
        try {
          const db = getAdminDb();
          await db
            .from("order_payments")
            .update({
              status: paid ? "paid" : "sent",
              provider_status: parsed.status,
              ...(paid && { paid_at: new Date().toISOString() }),
            })
            .eq("reference", reference);
          if (paid) {
            await db
              .from("orders")
              .update({ status: "paid", paid_at: new Date().toISOString() })
              .eq("payment_reference", reference);
          }
        } catch (dbErr) {
          console.error("[DB] Omari OTP DB update error:", dbErr);
        }
      })();

      res.json({ ok: true, status: parsed.status, paid });
    } catch (error) {
      console.error("[Omari OTP] error:", error);
      res.status(502).json({ error: error instanceof Error ? error.message : "OTP submission failed" });
    }
  });

  // ── 404 catch-all ───────────────────────────────────────────────────────
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
