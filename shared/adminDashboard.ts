import {
  type AdminAccessProfile,
  createAdminClient,
  hasAdminPermission,
  resolveAdminContext,
  type AdminAccessConfig,
} from "./adminAccess";

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
  adminUser: AdminAccessProfile;
}

export class AdminAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type DashboardConfig = AdminAccessConfig

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

function emptySummary(): AdminDashboardSummary {
  return {
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  };
}

function mapAuthorizationError(error: unknown): never {
  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    throw new AdminAccessError(error.status, error.message);
  }

  throw error;
}

export async function loadAdminDashboard(config: DashboardConfig): Promise<AdminDashboardPayload> {
  try {
    const { user, access } = await resolveAdminContext(config);

    if (!hasAdminPermission(access, "dashboard.read")) {
      return {
        summary: emptySummary(),
        payments: [],
        adminUser: access,
      };
    }

    const admin = createAdminClient(config);
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
    const canSeePayments = hasAdminPermission(access, "payments.read");
    const payments = canSeePayments
      ? orders.flatMap((order) =>
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
        )
      : [];

    const paidOrders = orders.filter((order) => order.status === "paid");
    const uniqueCustomers = new Set(orders.map((order) => order.customer_email?.trim().toLowerCase()).filter(Boolean));

    return {
      summary: canSeePayments
        ? {
            totalOrders: orders.length,
            paidOrders: paidOrders.length,
            pendingOrders: orders.filter((order) => order.status === "pending_payment").length,
            totalRevenue: paidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
            totalCustomers: uniqueCustomers.size,
          }
        : emptySummary(),
      payments,
      adminUser: {
        ...access,
        id: access.id || user.id,
        email: access.email ?? user.email ?? null,
      },
    };
  } catch (error) {
    mapAuthorizationError(error);
  }
}

