import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Paynow } from "paynow";
import { z } from "zod";
import { env } from "./env";
import { calculateCheckoutTotals } from "./catalog";
import { verifyPaynowHash } from "./lib/paynowHash";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
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

function createPaynowClient(returnUrl = env.PAYNOW_RETURN_URL): Paynow {
  const client = new Paynow(env.PAYNOW_INTEGRATION_ID, env.PAYNOW_INTEGRATION_KEY);
  client.resultUrl = env.PAYNOW_RESULT_URL;
  client.returnUrl = returnUrl;
  return client;
}

type PaymentState = {
  reference: string;
  amount: number;
  pollUrl: string;
  status: string;
  paid: boolean;
  updatedAt: number;
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

function toPaynowStatus(status: string | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

function isPaidStatus(status: string | undefined): boolean {
  const normalized = toPaynowStatus(status);
  return normalized === "paid" || normalized === "awaiting delivery";
}

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

  const { items, email, phone } = parsed.data;

  let totals;
  try {
    totals = calculateCheckoutTotals(items);
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

    if (phone) {
      payment.info = `Mobile ${phone}`;
    }

    const response = await paynow.send(payment);

    if (!response.success) {
      res.status(502).json({ error: "Unable to initialize Paynow payment" });
      return;
    }

    paymentStore.set(reference, {
      reference,
      amount: totals.amount,
      pollUrl: response.pollUrl,
      status: "sent",
      paid: false,
      updatedAt: Date.now(),
    });

    res.status(201).json({
      reference,
      redirectUrl: response.redirectUrl,
      pollUrl: response.pollUrl,
      amount: totals.amount,
    });
  } catch {
    res.status(502).json({ error: "Paynow request failed" });
  }
});

app.post("/api/payments/paynow/callback", (req, res) => {
  const payload = req.body as Record<string, string | undefined>;

  if (!verifyPaynowHash(payload, env.PAYNOW_INTEGRATION_KEY)) {
    res.status(401).json({ error: "Invalid callback hash" });
    return;
  }

  const reference = (payload.reference ?? payload.Reference ?? "").trim();
  if (!reference) {
    res.status(400).json({ error: "Missing reference" });
    return;
  }

  const status = (payload.status ?? payload.Status ?? "unknown").trim();
  const paid = isPaidStatus(status);

  const existing = paymentStore.get(reference);
  paymentStore.set(reference, {
    reference,
    amount: existing?.amount ?? Number(payload.amount ?? payload.Amount ?? 0),
    pollUrl: existing?.pollUrl ?? String(payload.pollurl ?? payload.PollUrl ?? ""),
    status,
    paid,
    updatedAt: Date.now(),
  });

  res.status(200).json({ ok: true });
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
      const paynow = createPaynowClient();
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
    amount: updated.amount,
    status: updated.status,
    paid: updated.paid,
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const cleanupTimer = setInterval(cleanupPaymentStore, 60 * 60 * 1000);
cleanupPaymentStore();

const server = app.listen(env.PORT, () => {
  console.log(`Paynow API listening on port ${env.PORT}`);
});

server.on("error", (error) => {
  console.error("Server failed to start", error);
  clearInterval(cleanupTimer);
  process.exit(1);
});

process.on("SIGINT", () => {
  clearInterval(cleanupTimer);
  server.close(() => process.exit(0));
});
