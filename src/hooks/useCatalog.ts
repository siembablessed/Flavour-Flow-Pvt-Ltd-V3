import { useQuery } from "@tanstack/react-query";
import { products as staticProducts, type Product } from "@/data/products";
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

function hasConfiguredSupabase(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  return Boolean(url && key && !url.includes("placeholder") && !key.includes("placeholder"));
}

async function loadCatalog(): Promise<Product[]> {
  if (!hasConfiguredSupabase()) {
    return staticProducts;
  }

  const { data, error } = await supabase
    .from("v_catalog")
    .select("product_id, category, name, pack, code, case_price, unit_price, unit_price_vat, is_active")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    return staticProducts;
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
  });
}
