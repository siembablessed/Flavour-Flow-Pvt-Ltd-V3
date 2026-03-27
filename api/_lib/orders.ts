import { getAdminClient } from "./supabaseAdmin.js";
import type { CheckoutTotals } from "./catalog.js";

export interface OrderCreateInput {
  reference: string;
  customerEmail: string;
  paymentMethod: string;
  totals: CheckoutTotals;
}

export interface CreatedOrder {
  orderId: string;
  orderNumber: string;
}

function toOrderNumber(reference: string): string {
  return reference;
}

function mapPaymentStatus(providerStatus: string): "paid" | "failed" | "sent" | "unknown" {
  const normalized = providerStatus.trim().toLowerCase();

  if (normalized === "paid" || normalized === "awaiting delivery") {
    return "paid";
  }

  if (normalized.includes("cancel") || normalized.includes("fail") || normalized.includes("reject")) {
    return "failed";
  }

  if (normalized === "sent" || normalized === "ok" || normalized === "pending") {
    return "sent";
  }

  return "unknown";
}

async function deleteOrderCascade(orderId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from("orders").delete().eq("id", orderId);
  if (error) {
    throw new Error("Failed to rollback order");
  }
}

export async function createOrderWithPayment(input: OrderCreateInput): Promise<CreatedOrder> {
  const admin = getAdminClient();
  const orderNumber = toOrderNumber(input.reference);

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_email: input.customerEmail,
      subtotal: input.totals.amount,
      total: input.totals.amount,
      status: "pending_payment",
      payment_reference: input.reference,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    throw new Error("Failed to create order");
  }

  const itemsPayload = input.totals.lines.map((line) => ({
    order_id: order.id,
    product_id: line.productId,
    product_name: line.name,
    pack: line.pack,
    unit_case_price: line.casePrice,
    quantity: line.quantity,
    line_total: line.lineTotal,
  }));

  const { error: itemsError } = await admin.from("order_items").insert(itemsPayload);
  if (itemsError) {
    await deleteOrderCascade(order.id);
    throw new Error("Failed to create order items");
  }

  const { error: paymentError } = await admin.from("order_payments").insert({
    order_id: order.id,
    provider: "paynow",
    payment_method: input.paymentMethod,
    reference: input.reference,
    amount: input.totals.amount,
    status: "initiated",
  });

  if (paymentError) {
    await deleteOrderCascade(order.id);
    throw new Error("Failed to initialize order payment");
  }

  return {
    orderId: order.id,
    orderNumber: order.order_number,
  };
}

export async function markPaymentDispatched(reference: string, pollUrl: string): Promise<void> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("order_payments")
    .update({ status: "sent", poll_url: pollUrl, provider_status: "sent" })
    .eq("reference", reference)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Failed to mark payment as dispatched");
  }
}

export async function markPaymentFailed(reference: string, reason: string): Promise<void> {
  const admin = getAdminClient();

  const { data: payment, error: paymentError } = await admin
    .from("order_payments")
    .update({ status: "failed", provider_status: reason })
    .eq("reference", reference)
    .select("order_id")
    .single();

  if (paymentError || !payment?.order_id) {
    throw new Error("Failed to mark payment as failed");
  }

  const { error: orderError } = await admin.from("orders").update({ status: "payment_failed" }).eq("id", payment.order_id);
  if (orderError) {
    throw new Error("Failed to mark order as payment_failed");
  }
}

export async function syncPaymentStatus(reference: string, providerStatus: string): Promise<{ orderNumber: string | null; amount: number | null; paid: boolean; status: string; }> {
  const admin = getAdminClient();
  const mapped = mapPaymentStatus(providerStatus);

  const paymentPatch: Record<string, unknown> = {
    status: mapped,
    provider_status: providerStatus,
  };

  if (mapped === "paid") {
    paymentPatch.paid_at = new Date().toISOString();
  }

  const { data: payment, error: paymentError } = await admin
    .from("order_payments")
    .update(paymentPatch)
    .eq("reference", reference)
    .select("order_id, amount")
    .single();

  if (paymentError || !payment) {
    return {
      orderNumber: null,
      amount: null,
      paid: mapped === "paid",
      status: providerStatus,
    };
  }

  const orderPatch: Record<string, unknown> = {
    status: mapped === "paid" ? "paid" : mapped === "failed" ? "payment_failed" : "pending_payment",
  };

  if (mapped === "paid") {
    orderPatch.paid_at = new Date().toISOString();
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .update(orderPatch)
    .eq("id", payment.order_id)
    .select("order_number")
    .single();

  if (orderError) {
    throw new Error("Failed to sync order status");
  }

  return {
    orderNumber: order?.order_number ?? null,
    amount: Number(payment.amount ?? 0),
    paid: mapped === "paid",
    status: providerStatus,
  };
}

export async function getOrderByReference(reference: string): Promise<{ orderNumber: string | null; amount: number | null; }>{
  const admin = getAdminClient();

  const { data: payment } = await admin
    .from("order_payments")
    .select("amount, order_id")
    .eq("reference", reference)
    .single();

  if (!payment) {
    return { orderNumber: null, amount: null };
  }

  const { data: order } = await admin
    .from("orders")
    .select("order_number")
    .eq("id", payment.order_id)
    .single();

  return {
    orderNumber: order?.order_number ?? null,
    amount: Number(payment.amount ?? 0),
  };
}