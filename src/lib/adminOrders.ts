import type { OrderStatus } from "../../shared/adminOrders";

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

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | T | null;

  if (!response.ok) {
    const message = payload && typeof payload === "object" && payload !== null && "error" in payload
      ? String((payload as { error?: string }).error || fallback)
      : fallback;
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchAdminOrders(
  accessToken: string,
  limit = 50,
  offset = 0,
  status?: OrderStatus,
  search?: string
): Promise<AdminOrderListResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (status) params.set("status", status);
  if (search) params.set("search", search);

  const response = await fetch(`/api/admin/orders?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<AdminOrderListResponse>(response, "Unable to load orders.");
}

export async function fetchAdminOrderDetail(
  accessToken: string,
  orderId: string
): Promise<AdminOrderDetailRow> {
  const response = await fetch(`/api/admin/orders?id=${encodeURIComponent(orderId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<AdminOrderDetailRow>(response, "Unable to load order details.");
}

export async function updateAdminOrderStatus(
  accessToken: string,
  orderId: string,
  newStatus: OrderStatus
): Promise<AdminOrderRow> {
  const params = new URLSearchParams();
  params.set("id", orderId);

  const response = await fetch(`/api/admin/orders?${params}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ status: newStatus }),
  });

  return parseJson<AdminOrderRow>(response, "Unable to update order status.");
}