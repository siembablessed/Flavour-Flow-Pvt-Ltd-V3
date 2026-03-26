import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/data/products";
import { supabase } from "@/lib/supabase";

interface CatalogRow {
  product_id: string;
  category: string;
  name: string;
  pack: string;
  code: string;
  case_price: number;
  unit_price: number;
  unit_price_vat: number;
  is_active: boolean;
}

async function loadCatalog(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("v_catalog")
    .select("product_id, category, name, pack, code, case_price, unit_price, unit_price_vat, is_active")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    throw new Error("Failed to fetch catalog from database");
  }

  return (data as CatalogRow[]).map((row) => ({
    id: row.product_id,
    category: row.category,
    name: row.name,
    pack: row.pack,
    code: row.code,
    casePrice: Number(row.case_price),
    unitPrice: Number(row.unit_price),
    unitPriceVat: Number(row.unit_price_vat),
  }));
}

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: loadCatalog,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
