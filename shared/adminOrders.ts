import { writeAdminAuditLog } from "./adminAudit";
import {
  assertAdminPermission,
  resolveAdminContext,
  type AdminAccessConfig,
} from "./adminAccess";

export type OrderStatus = "pending_payment" | "paid" | "payment_failed" | "cancelled" | "fulfilled";

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  customerEmail: string | null;
  currency: string;
  subtotal: number;
  total: number;
  status: OrderStatus;
  paymentReference: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
}

export interface AdminOrderItemRow {
  id: number;
  orderId: string;
  productId: string;
  productName: string;
  pack: string;
  unitCasePrice: number;
  quantity: number;
  lineTotal: number;
  createdAt: string;
}

export interface AdminOrderDetailRow extends AdminOrderRow {
  items: AdminOrderItemRow[];
}

export interface AdminOrderListResponse {
  orders: AdminOrderRow[];
  total: number;
  summary: {
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    totalRevenue: number;
  };
}

export class AdminOrdersError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type OrdersConfig = AdminAccessConfig

function mapAuthorizationError(error: unknown): never {
  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    throw new AdminOrdersError(error.status, error.message);
  }

  throw error;
}

async function requireOrdersAccess(config: OrdersConfig, permission: "orders.read" | "orders.write") {
  try {
    const context = await resolveAdminContext(config);
    assertAdminPermission(
      context.access,
      permission,
      permission === "orders.write" ? "You do not have permission to change orders." : "You do not have permission to view orders.",
    );
    return context;
  } catch (error) {
    mapAuthorizationError(error);
  }
}

function normalizeOrderRow(row: Record<string, unknown>): AdminOrderRow {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    customerEmail: row.customer_email ? String(row.customer_email) : null,
    currency: String(row.currency ?? "USD"),
    subtotal: Number(row.subtotal ?? 0),
    total: Number(row.total ?? 0),
    status: String(row.status) as OrderStatus,
    paymentReference: row.payment_reference ? String(row.payment_reference) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    paidAt: row.paid_at ? String(row.paid_at) : null,
  };
}

function normalizeOrderItemRow(row: Record<string, unknown>): AdminOrderItemRow {
  return {
    id: Number(row.id),
    orderId: String(row.order_id),
    productId: String(row.product_id),
    productName: String(row.product_name),
    pack: String(row.pack),
    unitCasePrice: Number(row.unit_case_price ?? 0),
    quantity: Number(row.quantity ?? 0),
    lineTotal: Number(row.line_total ?? 0),
    createdAt: String(row.created_at ?? ""),
  };
}

export function exportOrdersToCsv(orders: AdminOrderRow[]): string {
  const headers = ["Order Number", "Customer Email", "Status", "Total", "Created At", "Paid At"];
  const rows = orders.map((order) => [
    order.orderNumber,
    order.customerEmail ?? "",
    order.status,
    order.total.toFixed(2),
    order.createdAt,
    order.paidAt ?? "",
  ]);

  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function loadAdminOrders(
  config: OrdersConfig,
  limit = 50,
  offset = 0,
  status?: OrderStatus,
  search?: string,
  startDate?: string,
  endDate?: string,
): Promise<AdminOrderListResponse> {
  const { admin } = await requireOrdersAccess(config, "orders.read");

  let query = admin
    .from("orders")
    .select("id, order_number, customer_email, currency, subtotal, total, status, payment_reference, created_at, updated_at, paid_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
  }
  if (search && search.trim()) {
    const searchTerm = `%${search.trim().toLowerCase()}%`;
    query = query.or(`order_number.ilike.${searchTerm},customer_email.ilike.${searchTerm}`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Unable to load orders.");
  }

  let countQuery = admin.from("orders").select("*", { count: "exact", head: true });
  if (status) {
    countQuery = countQuery.eq("status", status);
  }
  if (startDate) {
    countQuery = countQuery.gte("created_at", startDate);
  }
  if (endDate) {
    countQuery = countQuery.lte("created_at", `${endDate}T23:59:59.999Z`);
  }
  if (search && search.trim()) {
    const searchTerm = `%${search.trim().toLowerCase()}%`;
    countQuery = countQuery.or(`order_number.ilike.${searchTerm},customer_email.ilike.${searchTerm}`);
  }
  const { count } = await countQuery;

  let summaryQuery = admin.from("orders").select("status, total, paid_at");
  if (startDate) {
    summaryQuery = summaryQuery.gte("created_at", startDate);
  }
  if (endDate) {
    summaryQuery = summaryQuery.lte("created_at", `${endDate}T23:59:59.999Z`);
  }
  const { data: summaryData } = await summaryQuery;

  const summary = {
    totalOrders: summaryData?.length ?? 0,
    paidOrders: summaryData?.filter((o) => o.status === "paid").length ?? 0,
    pendingOrders: summaryData?.filter((o) => o.status === "pending_payment").length ?? 0,
    totalRevenue: summaryData?.filter((o) => o.status === "paid").reduce((sum, o) => sum + Number(o.total ?? 0), 0) ?? 0,
  };

  const orders = ((data as Array<Record<string, unknown>>) ?? []).map(normalizeOrderRow);
  return { orders, total: count ?? 0, summary };
}

export async function loadAdminOrderDetail(
  config: OrdersConfig,
  orderId: string,
): Promise<AdminOrderDetailRow> {
  const { admin } = await requireOrdersAccess(config, "orders.read");

  const { data: orderData, error: orderError } = await admin
    .from("orders")
    .select("id, order_number, customer_email, currency, subtotal, total, status, payment_reference, created_at, updated_at, paid_at")
    .eq("id", orderId)
    .single();

  if (orderError || !orderData) {
    throw new AdminOrdersError(404, "Order not found.");
  }

  const { data: itemsData } = await admin
    .from("order_items")
    .select("id, order_id, product_id, product_name, pack, unit_case_price, quantity, line_total, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  const order = normalizeOrderRow(orderData as Record<string, unknown>);
  const items = ((itemsData as Array<Record<string, unknown>>) ?? []).map(normalizeOrderItemRow);

  return { ...order, items };
}

export async function updateAdminOrderStatus(
  config: OrdersConfig,
  orderId: string,
  newStatus: OrderStatus,
): Promise<AdminOrderRow> {
  const { admin, user } = await requireOrdersAccess(config, "orders.write");

  const { data: current } = await admin.from("orders").select("id, order_number, status, paid_at").eq("id", orderId).single();
  if (!current) {
    throw new AdminOrdersError(404, "Order not found.");
  }

  const currentStatus = String(current.status);
  const allowedTransitions: Record<string, string[]> = {
    pending_payment: ["paid", "cancelled"],
    paid: ["fulfilled", "cancelled"],
    payment_failed: ["pending_payment"],
    cancelled: [],
    fulfilled: [],
  };

  if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
    throw new AdminOrdersError(400, `Cannot change order status from ${currentStatus} to ${newStatus}.`);
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "paid" && !current.paid_at) {
    updateData.paid_at = new Date().toISOString();
  }

  const { data, error } = await admin.from("orders").update(updateData).eq("id", orderId).select().single();
  if (error || !data) {
    throw new AdminOrdersError(400, error?.message || "Unable to update order status.");
  }

  await writeAdminAuditLog(admin, {
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "orders.status.update",
    resourceType: "order",
    resourceId: orderId,
    details: {
      from: currentStatus,
      to: newStatus,
    },
  });

  return normalizeOrderRow(data as Record<string, unknown>);
}

