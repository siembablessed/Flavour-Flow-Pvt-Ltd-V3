import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface InventorySnapshotRow {
  product_id: string;
  name: string;
  location_code: string;
  location_name: string;
  on_hand_cases: number;
  reserved_cases: number;
  available_cases: number;
  reorder_level_cases: number;
  updated_at: string;
}

async function loadInventorySnapshot(): Promise<InventorySnapshotRow[]> {
  const { data, error } = await supabase
    .from("v_inventory_snapshot")
    .select("product_id, name, location_code, location_name, on_hand_cases, reserved_cases, available_cases, reorder_level_cases, updated_at")
    .order("location_code", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    throw new Error("Failed to load inventory snapshot");
  }

  return (data as InventorySnapshotRow[]).map((row) => ({
    ...row,
    on_hand_cases: Number(row.on_hand_cases),
    reserved_cases: Number(row.reserved_cases),
    available_cases: Number(row.available_cases),
    reorder_level_cases: Number(row.reorder_level_cases),
  }));
}

export function useInventorySnapshot() {
  return useQuery({
    queryKey: ["inventory-snapshot"],
    queryFn: loadInventorySnapshot,
    staleTime: 60 * 1000,
    retry: 1,
  });
}
