import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PublicInventoryRow {
  product_id: string;
  name: string;
  available_cases: number;
  updated_at: string;
}

async function loadPublicInventory(): Promise<PublicInventoryRow[]> {
  const { data, error } = await supabase
    .from("v_inventory_public")
    .select("product_id, name, available_cases, updated_at")
    .order("name", { ascending: true });

  if (error || !data) {
    throw new Error("Failed to load public inventory");
  }

  return (data as PublicInventoryRow[]).map((row) => ({
    ...row,
    available_cases: Number(row.available_cases),
  }));
}

export function usePublicInventory() {
  return useQuery({
    queryKey: ["public-inventory"],
    queryFn: loadPublicInventory,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

