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

export async function calculateCheckoutTotals(lines: CartLineInput[]): Promise<CheckoutTotals> {
  const client = getAdminClient();
  const uniqueIds = Array.from(new Set(lines.map((line) => line.id)));

  const { data, error } = await client
    .from("products")
    .select("product_id, name, pack, case_price, is_active")
    .in("product_id", uniqueIds);

  if (error || !data) {
    throw new Error("Unable to load catalog prices");
  }

  const productMap = new Map<string, { name: string; pack: string; casePrice: number }>();
  for (const row of data) {
    if (!row.is_active) {
      continue;
    }

    productMap.set(row.product_id, {
      name: String(row.name),
      pack: String(row.pack),
      casePrice: Number(row.case_price),
    });
  }

  let amount = 0;
  const pricedLines: CheckoutPricedLine[] = [];

  for (const line of lines) {
    const product = productMap.get(line.id);
    if (!product || Number.isNaN(product.casePrice)) {
      throw new Error(`Unknown or inactive product id: ${line.id}`);
    }

    const lineTotal = Number((product.casePrice * line.quantity).toFixed(2));
    amount += lineTotal;

    pricedLines.push({
      productId: line.id,
      name: product.name,
      pack: product.pack,
      casePrice: product.casePrice,
      quantity: line.quantity,
      lineTotal,
    });
  }

  return {
    amount: Number(amount.toFixed(2)),
    description: `Wholesale order (${lines.length} item types)`,
    lines: pricedLines,
  };
}
