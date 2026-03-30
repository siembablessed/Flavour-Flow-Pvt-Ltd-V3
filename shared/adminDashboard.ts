import { createClient, type User } from "@supabase/supabase-js";

export interface AdminPaymentRow {
  id: string;
  orderNumber: string;
  customerEmail: string | null;
  amount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  reference: string;
  createdAt: string;
  paidAt: string | null;
  providerStatus: string | null;
}

export interface AdminDashboardSummary {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalCustomers: number;
}

export interface AdminDashboardPayload {
  summary: AdminDashboardSummary;
  payments: AdminPaymentRow[];
  adminUser: {
    id: string;
    email: string | null;
  };
}

export class AdminAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface DashboardConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  adminEmails: string[];
  authorizationHeader?: string | string[];
}

interface RawOrder {
  id: string;
  order_number: string;
  customer_email: string | null;
  total: number | string;
  status: string;
  created_at: string;
  paid_at: string | null;
  order_payments?: Array<{
    id: number;
    reference: string;
    amount: number | string;
    status: string;
    payment_method: string | null;
    created_at: string;
    paid_at: string | null;
    provider_status: string | null;
  }>;
}

function parseBearerToken(header?: string | string[]): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;

  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function normalizeAdminEmails(adminEmails: string[]): string[] {
  return adminEmails.map((email) => email.trim().toLowerCase()).filter(Boolean);
}

async function requireAdminUser(config: DashboardConfig): Promise<User> {
  const token = parseBearerToken(config.authorizationHeader);
  if (!token) {
    throw new AdminAccessError(401, "Sign in to access the admin dashboard.");
  }

  const admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    throw new AdminAccessError(401, "Your session could not be verified.");
  }

  const allowedEmails = normalizeAdminEmails(config.adminEmails);
  if (allowedEmails.length === 0) {
    throw new AdminAccessError(403, "Admin access is not configured yet. Add ADMIN_EMAILS on the server.");
  }

  const userEmail = data.user.email?.toLowerCase() ?? "";
  if (!allowedEmails.includes(userEmail)) {
    throw new AdminAccessError(403, "Your account does not have admin access.");
  }

  return data.user;
}

export async function loadAdminDashboard(config: DashboardConfig): Promise<AdminDashboardPayload> {
  const user = await requireAdminUser(config);
  const admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await admin
    .from("orders")
    .select(`
      id,
      order_number,
      customer_email,
      total,
      status,
      created_at,
      paid_at,
      order_payments (
        id,
        reference,
        amount,
        status,
        payment_method,
        created_at,
        paid_at,
        provider_status
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error("Unable to load admin payment data.");
  }

  const orders = (data as RawOrder[] | null) ?? [];
  const payments = orders.flatMap((order) =>
    (order.order_payments ?? []).map((payment) => ({
      id: `${order.id}-${payment.id}`,
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      amount: Number(payment.amount ?? order.total ?? 0),
      orderStatus: order.status,
      paymentStatus: payment.status,
      paymentMethod: payment.payment_method,
      reference: payment.reference,
      createdAt: payment.created_at ?? order.created_at,
      paidAt: payment.paid_at ?? order.paid_at,
      providerStatus: payment.provider_status,
    })),
  );

  const paidOrders = orders.filter((order) => order.status === "paid");
  const uniqueCustomers = new Set(orders.map((order) => order.customer_email?.trim().toLowerCase()).filter(Boolean));

  return {
    summary: {
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      pendingOrders: orders.filter((order) => order.status === "pending_payment").length,
      totalRevenue: paidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
      totalCustomers: uniqueCustomers.size,
    },
    payments,
    adminUser: {
      id: user.id,
      email: user.email ?? null,
    },
  };
}
