import {
  assertAdminPermission,
  resolveAdminContext,
  type AdminAccessConfig,
} from "./adminAccess";

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

type SnapshotConfig = AdminAccessConfig

function mapAuthorizationError(error: unknown): never {
  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    throw new AdminInventorySnapshotError(error.status, error.message);
  }

  throw error;
}

async function requireInventorySnapshotAccess(config: SnapshotConfig) {
  try {
    const context = await resolveAdminContext(config);
    assertAdminPermission(context.access, "inventory.read", "You do not have permission to view inventory.");
    return context;
  } catch (error) {
    mapAuthorizationError(error);
  }
}

export async function loadAdminInventorySnapshot(config: SnapshotConfig, limit = 500): Promise<AdminInventorySnapshotRow[]> {
  const { admin } = await requireInventorySnapshotAccess(config);

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

