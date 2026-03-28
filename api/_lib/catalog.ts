import { getAdminClient } from "./supabaseAdmin.js";

export interface CartLineInput {
  id: string;
  quantity: number;
}

export interface CheckoutPricedLine {
  productId: string;
  name: string;
  pack: string;
  casePrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CheckoutTotals {
  amount: number;
  description: string;
  lines: CheckoutPricedLine[];
}

type CatalogRow = {
  product_id: string;
  name: string;
  pack: string;
  case_price: number;
  is_active: boolean;
};

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

function toErrorDetails(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "unknown";
  }

  const message = "message" in value ? String((value as { message?: unknown }).message ?? "") : "";
  const details = "details" in value ? String((value as { details?: unknown }).details ?? "") : "";
  const code = "code" in value ? String((value as { code?: unknown }).code ?? "") : "";
  return [message, details, code].filter(Boolean).join(" | ") || "unknown";
}

async function loadCatalogRows(ids: string[]): Promise<CatalogRow[]> {
  const client = getAdminClient();

  const fromProducts = await client
    .from("products")
    .select("product_id, name, pack, case_price, is_active")
    .in("product_id", ids);

  if (!fromProducts.error && fromProducts.data) {
    return fromProducts.data as CatalogRow[];
  }

  const fromView = await client
    .from("v_catalog")
    .select("product_id, name, pack, case_price, is_active")
    .in("product_id", ids)
    .eq("is_active", true);

  if (fromView.error || !fromView.data) {
    const productsErr = toErrorDetails(fromProducts.error);
    const viewErr = toErrorDetails(fromView.error);
    throw new Error(`Unable to load catalog prices. products_error=${productsErr}; v_catalog_error=${viewErr}`);
  }

  return fromView.data as CatalogRow[];
}

export async function calculateCheckoutTotals(lines: CartLineInput[]): Promise<CheckoutTotals> {
  const uniqueIds = Array.from(new Set(lines.map((line) => String(line.id).trim())));
  const normalizedIncoming = new Map(uniqueIds.map((id) => [normalizeId(id), id]));

  const rows = await loadCatalogRows(uniqueIds);

  const productMap = new Map<string, { rawId: string; name: string; pack: string; casePrice: number }>();
  for (const row of rows) {
    if (!row.is_active) {
      continue;
    }

    const norm = normalizeId(String(row.product_id));
    productMap.set(norm, {
      rawId: String(row.product_id),
      name: String(row.name),
      pack: String(row.pack),
      casePrice: Number(row.case_price),
    });
  }

  let amount = 0;
  const pricedLines: CheckoutPricedLine[] = [];
  const invalidIds: string[] = [];

  for (const line of lines) {
    const incomingId = String(line.id);
    const norm = normalizeId(incomingId);
    const product = productMap.get(norm);

    if (!product || Number.isNaN(product.casePrice)) {
      invalidIds.push(incomingId);
      continue;
    }

    const lineTotal = Number((product.casePrice * line.quantity).toFixed(2));
    amount += lineTotal;

    pricedLines.push({
      productId: product.rawId,
      name: product.name,
      pack: product.pack,
      casePrice: product.casePrice,
      quantity: line.quantity,
      lineTotal,
    });
  }

  if (invalidIds.length > 0) {
    const availableIds = Array.from(productMap.keys())
      .map((norm) => normalizedIncoming.get(norm) ?? norm)
      .slice(0, 20)
      .join(", ");
    throw new Error(`Unknown or inactive product ids: ${Array.from(new Set(invalidIds)).join(", ")}. Available matches: ${availableIds || "none"}`);
  }

  return {
    amount: Number(amount.toFixed(2)),
    description: `Wholesale order (${lines.length} item types)`,
    lines: pricedLines,
  };
}
