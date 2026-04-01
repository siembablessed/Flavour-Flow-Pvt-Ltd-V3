import { createClient, type User } from "@supabase/supabase-js";

export interface AdminInventorySnapshotRow {
  productId: string;
  name: string;
  locationCode: string;
  locationName: string;
  onHandCases: number;
  reservedCases: number;
  availableCases: number;
  reorderLevelCases: number;
  updatedAt: string;
}

export class AdminInventorySnapshotError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface SnapshotConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  adminEmails: string[];
  authorizationHeader?: string | string[];
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

function createAdminClient(config: SnapshotConfig) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function requireAdminUser(config: SnapshotConfig): Promise<{ admin: ReturnType<typeof createAdminClient>; user: User }> {
  const token = parseBearerToken(config.authorizationHeader);
  if (!token) {
    throw new AdminInventorySnapshotError(401, "Sign in to access inventory reporting.");
  }

  const admin = createAdminClient(config);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    throw new AdminInventorySnapshotError(401, "Your session could not be verified.");
  }

  const allowedEmails = normalizeAdminEmails(config.adminEmails);
  if (allowedEmails.length === 0) {
    throw new AdminInventorySnapshotError(403, "Admin access is not configured yet. Add ADMIN_EMAILS on the server.");
  }

  const userEmail = data.user.email?.toLowerCase() ?? "";
  if (!allowedEmails.includes(userEmail)) {
    throw new AdminInventorySnapshotError(403, "Your account does not have admin access.");
  }

  return { admin, user: data.user };
}

export async function loadAdminInventorySnapshot(config: SnapshotConfig, limit = 500): Promise<AdminInventorySnapshotRow[]> {
  const { admin } = await requireAdminUser(config);

  const { data, error } = await admin
    .from("v_inventory_snapshot")
    .select("product_id, name, location_code, location_name, on_hand_cases, reserved_cases, available_cases, reorder_level_cases, updated_at")
    .order("location_code", { ascending: true })
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error("Unable to load inventory snapshot.");
  }

  return ((data as Array<Record<string, unknown>>) ?? []).map((row) => ({
    productId: String(row.product_id ?? ""),
    name: String(row.name ?? ""),
    locationCode: String(row.location_code ?? ""),
    locationName: String(row.location_name ?? ""),
    onHandCases: Number(row.on_hand_cases ?? 0),
    reservedCases: Number(row.reserved_cases ?? 0),
    availableCases: Number(row.available_cases ?? 0),
    reorderLevelCases: Number(row.reorder_level_cases ?? 0),
    updatedAt: String(row.updated_at ?? ""),
  }));
}

