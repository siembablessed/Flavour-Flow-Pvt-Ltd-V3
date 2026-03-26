import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

export interface CartLineInput {
  id: string;
  quantity: number;
}

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const env = getEnv();
  adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}

export async function calculateCheckoutTotals(lines: CartLineInput[]) {
  const client = getAdminClient();
  const uniqueIds = Array.from(new Set(lines.map((line) => line.id)));

  const { data, error } = await client
    .from("products")
    .select("product_id, case_price, is_active")
    .in("product_id", uniqueIds);

  if (error || !data) {
    throw new Error("Unable to load catalog prices");
  }

  const priceMap = new Map<string, number>();
  for (const row of data) {
    if (!row.is_active) {
      continue;
    }

    priceMap.set(row.product_id, Number(row.case_price));
  }

  let amount = 0;

  for (const line of lines) {
    const casePrice = priceMap.get(line.id);
    if (typeof casePrice !== "number" || Number.isNaN(casePrice)) {
      throw new Error(`Unknown or inactive product id: ${line.id}`);
    }

    amount += casePrice * line.quantity;
  }

  return {
    amount: Number(amount.toFixed(2)),
    description: `Wholesale order (${lines.length} item types)`,
  };
}
