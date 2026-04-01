import type { AdminDashboardPayload } from "../../shared/adminDashboard";
import type {
  AdminInventoryMovementRow,
  AdminInventoryMutationResult,
  InventoryMovementType,
} from "../../shared/adminInventory";

export interface InventoryMovementInput {
  movementType: InventoryMovementType;
  productId: string;
  locationCode: string;
  quantityCases: number;
  note?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
}

export interface ReorderLevelInput {
  productId: string;
  locationCode: string;
  reorderLevelCases: number;
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

export async function fetchAdminDashboard(accessToken: string): Promise<AdminDashboardPayload> {
  const response = await fetch("/api/admin/dashboard", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<AdminDashboardPayload>(response, "Unable to load admin dashboard.");
}

export async function fetchAdminInventoryMovements(accessToken: string): Promise<AdminInventoryMovementRow[]> {
  const response = await fetch("/api/admin/inventory/movements", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJson<{ movements: AdminInventoryMovementRow[] }>(response, "Unable to load inventory movements.");
  return payload.movements;
}

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

export async function fetchAdminInventorySnapshot(accessToken: string): Promise<AdminInventorySnapshotRow[]> {
  const response = await fetch("/api/admin/inventory/snapshot", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJson<{ snapshot: AdminInventorySnapshotRow[] }>(response, "Unable to load inventory snapshot.");
  return payload.snapshot;
}

export async function createInventoryMovement(accessToken: string, input: InventoryMovementInput): Promise<AdminInventoryMutationResult> {
  const response = await fetch("/api/admin/inventory/movements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  return parseJson<AdminInventoryMutationResult>(response, "Unable to record inventory movement.");
}

export async function updateReorderLevel(accessToken: string, input: ReorderLevelInput): Promise<AdminInventoryMutationResult> {
  const response = await fetch("/api/admin/inventory/reorder-level", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  return parseJson<AdminInventoryMutationResult>(response, "Unable to update reorder level.");
}
