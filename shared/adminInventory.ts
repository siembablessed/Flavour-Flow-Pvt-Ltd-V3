import { writeAdminAuditLog } from "./adminAudit";
import {
  assertAdminPermission,
  createAdminClient,
  resolveAdminContext,
  type AdminAccessConfig,
} from "./adminAccess";

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

type InventoryConfig = AdminAccessConfig

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

function mapAuthorizationError(error: unknown): never {
  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    throw new AdminInventoryError(error.status, error.message);
  }

  throw error;
}

async function requireInventoryAccess(config: InventoryConfig, permission: "inventory.read" | "inventory.write") {
  try {
    const context = await resolveAdminContext(config);
    assertAdminPermission(
      context.access,
      permission,
      permission === "inventory.write" ? "You do not have permission to change inventory." : "You do not have permission to view inventory.",
    );
    return context;
  } catch (error) {
    mapAuthorizationError(error);
  }
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
  const { admin } = await requireInventoryAccess(config, "inventory.read");
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
  const { admin, user } = await requireInventoryAccess(config, "inventory.write");
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

  await writeAdminAuditLog(admin, {
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "inventory.movement.record",
    resourceType: "inventory_movement",
    resourceId: `${product.id}:${location.id}`,
    details: input,
  });

  return {
    ok: true,
    message: `${input.movementType.replace("_", " ")} recorded for ${product.name} at ${location.name}.`,
  };
}

export async function updateAdminReorderLevel(
  config: InventoryConfig,
  input: ReorderLevelInput,
): Promise<AdminInventoryMutationResult> {
  const { admin, user } = await requireInventoryAccess(config, "inventory.write");
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

  await writeAdminAuditLog(admin, {
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "inventory.reorder_level.update",
    resourceType: "inventory_level",
    resourceId: `${product.id}:${location.id}`,
    details: input,
  });

  return {
    ok: true,
    message: `Reorder level updated for ${product.name} at ${location.name}.`,
  };
}

