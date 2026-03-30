import { createClient, type User } from "@supabase/supabase-js";

export type InventoryMovementType =
  | "stock_in"
  | "stock_out"
  | "reserve"
  | "release"
  | "adjustment_plus"
  | "adjustment_minus";

export interface AdminInventoryMovementRow {
  id: number;
  movementType: InventoryMovementType;
  productId: string;
  productName: string;
  productCode: string;
  locationCode: string;
  locationName: string;
  quantityCases: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface AdminInventoryMutationResult {
  ok: true;
  message: string;
}

interface InventoryConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  adminEmails: string[];
  authorizationHeader?: string | string[];
}

interface InventoryMovementInput {
  movementType: InventoryMovementType;
  productId: string;
  locationCode: string;
  quantityCases: number;
  note?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
}

interface ReorderLevelInput {
  productId: string;
  locationCode: string;
  reorderLevelCases: number;
}

export class AdminInventoryError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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

function createAdminClient(config: InventoryConfig) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function requireAdminUser(config: InventoryConfig): Promise<{ admin: ReturnType<typeof createAdminClient>; user: User }> {
  const token = parseBearerToken(config.authorizationHeader);
  if (!token) {
    throw new AdminInventoryError(401, "Sign in to manage inventory.");
  }

  const admin = createAdminClient(config);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    throw new AdminInventoryError(401, "Your session could not be verified.");
  }

  const allowedEmails = normalizeAdminEmails(config.adminEmails);
  if (allowedEmails.length === 0) {
    throw new AdminInventoryError(403, "Admin access is not configured yet. Add ADMIN_EMAILS on the server.");
  }

  const userEmail = data.user.email?.toLowerCase() ?? "";
  if (!allowedEmails.includes(userEmail)) {
    throw new AdminInventoryError(403, "Your account does not have admin access.");
  }

  return { admin, user: data.user };
}

async function resolveInventoryRefs(admin: ReturnType<typeof createAdminClient>, productId: string, locationCode: string) {
  const [{ data: product, error: productError }, { data: location, error: locationError }] = await Promise.all([
    admin.from("products").select("id, product_id, name, code").eq("product_id", productId).single(),
    admin.from("inventory_locations").select("id, location_code, name").eq("location_code", locationCode).single(),
  ]);

  if (productError || !product) {
    throw new AdminInventoryError(404, "Product not found.");
  }

  if (locationError || !location) {
    throw new AdminInventoryError(404, "Inventory location not found.");
  }

  return { product, location };
}

export async function loadAdminInventoryMovements(
  config: InventoryConfig,
  limit = 25,
): Promise<AdminInventoryMovementRow[]> {
  const { admin } = await requireAdminUser(config);
  const { data, error } = await admin
    .from("inventory_movements")
    .select(`
      id,
      movement_type,
      quantity_cases,
      reference_type,
      reference_id,
      note,
      created_at,
      created_by,
      products!inventory_movements_product_id_fkey (
        product_id,
        name,
        code
      ),
      inventory_locations!inventory_movements_location_id_fkey (
        location_code,
        name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Unable to load inventory movements.");
  }

  return ((data as Array<Record<string, unknown>>) ?? []).map((row) => {
    const product = row.products as Record<string, unknown> | null;
    const location = row.inventory_locations as Record<string, unknown> | null;

    return {
      id: Number(row.id),
      movementType: String(row.movement_type) as InventoryMovementType,
      productId: String(product?.product_id ?? ""),
      productName: String(product?.name ?? ""),
      productCode: String(product?.code ?? ""),
      locationCode: String(location?.location_code ?? ""),
      locationName: String(location?.name ?? ""),
      quantityCases: Number(row.quantity_cases ?? 0),
      referenceType: row.reference_type ? String(row.reference_type) : null,
      referenceId: row.reference_id ? String(row.reference_id) : null,
      note: row.note ? String(row.note) : null,
      createdAt: String(row.created_at ?? ""),
      createdBy: row.created_by ? String(row.created_by) : null,
    };
  });
}

export async function recordAdminInventoryMovement(
  config: InventoryConfig,
  input: InventoryMovementInput,
): Promise<AdminInventoryMutationResult> {
  const { admin, user } = await requireAdminUser(config);
  const { product, location } = await resolveInventoryRefs(admin, input.productId, input.locationCode);

  const { error } = await admin.rpc("record_inventory_movement", {
    p_movement_type: input.movementType,
    p_product_id: product.id,
    p_location_id: location.id,
    p_quantity_cases: input.quantityCases,
    p_reference_type: input.referenceType ?? null,
    p_reference_id: input.referenceId ?? null,
    p_note: input.note ?? null,
    p_created_by: user.id,
  });

  if (error) {
    throw new AdminInventoryError(400, error.message || "Unable to record inventory movement.");
  }

  return {
    ok: true,
    message: `${input.movementType.replace("_", " ")} recorded for ${product.name} at ${location.name}.`,
  };
}

export async function updateAdminReorderLevel(
  config: InventoryConfig,
  input: ReorderLevelInput,
): Promise<AdminInventoryMutationResult> {
  const { admin } = await requireAdminUser(config);
  const { product, location } = await resolveInventoryRefs(admin, input.productId, input.locationCode);

  const { error } = await admin.from("inventory_levels").upsert(
    {
      product_id: product.id,
      location_id: location.id,
      reorder_level_cases: input.reorderLevelCases,
    },
    { onConflict: "product_id,location_id" },
  );

  if (error) {
    throw new AdminInventoryError(400, error.message || "Unable to update reorder level.");
  }

  return {
    ok: true,
    message: `Reorder level updated for ${product.name} at ${location.name}.`,
  };
}
