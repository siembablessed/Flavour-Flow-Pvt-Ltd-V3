import { products } from "../../src/data/products";

const productMap = new Map(products.map((product) => [product.id, product]));

export interface CartLineInput {
  id: string;
  quantity: number;
}

export function calculateCheckoutTotals(lines: CartLineInput[]) {
  let amount = 0;

  for (const line of lines) {
    const product = productMap.get(line.id);
    if (!product) {
      throw new Error(`Unknown product id: ${line.id}`);
    }

    amount += product.casePrice * line.quantity;
  }

  return {
    amount: Number(amount.toFixed(2)),
    description: `Wholesale order (${lines.length} item types)`,
  };
}
