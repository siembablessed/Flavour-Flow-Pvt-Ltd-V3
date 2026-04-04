import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { hasAdminPermission } from "../../../shared/adminAccess";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminAccessNotice from "./AdminAccessNotice";
import { useAdminOutlet } from "./useAdminOutlet";
import { formatCurrency, formatDate } from "./adminFormat";

type CatalogueSortKey = "name" | "casePrice" | "available" | "stockState";

export default function AdminCataloguePage() {
  const { products, inventory, access } = useAdminOutlet();
  const canReadCatalogue = hasAdminPermission(access, "catalog.read");

  const [productSearch, setProductSearch] = useState("");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sortBy, setSortBy] = useState<CatalogueSortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");


  const inventoryByProduct = useMemo(() => {
    const map = new Map<string, { available: number; reorderLevel: number; updatedAt: string }>();
    for (const row of inventory) {
      const current = map.get(row.product_id) ?? { available: 0, reorderLevel: 0, updatedAt: row.updated_at };
      current.available += row.available_cases;
      current.reorderLevel = Math.max(current.reorderLevel, row.reorder_level_cases);
      if (new Date(row.updated_at).getTime() > new Date(current.updatedAt).getTime()) {
        current.updatedAt = row.updated_at;
      }
      map.set(row.product_id, current);
    }
    return map;
  }, [inventory]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products
      .filter((product) => {
        if (!query) return true;
        return [product.name, product.code, product.category].some((field) => field.toLowerCase().includes(query));
      })
      .map((product) => {
        const stock = inventoryByProduct.get(product.id);
        const available = stock?.available ?? 0;
        const reorderLevel = stock?.reorderLevel ?? 0;
        const stockState = available <= 0 ? "Out" : available <= reorderLevel ? "Low" : "Healthy";
        return {
          ...product,
          available,
          reorderLevel,
          stockState,
          updatedAt: stock?.updatedAt ?? null,
        };
      });
  }, [inventoryByProduct, productSearch, products]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    list.sort((a, b) => {
      let delta = 0;
      if (sortBy === "name") delta = a.name.localeCompare(b.name);
      if (sortBy === "casePrice") delta = a.casePrice - b.casePrice;
      if (sortBy === "available") delta = a.available - b.available;
      if (sortBy === "stockState") delta = a.stockState.localeCompare(b.stockState);
      return sortDirection === "asc" ? delta : -delta;
    });
    return list;
  }, [filteredProducts, sortBy, sortDirection]);

  const rowPadding = density === "compact" ? "py-2" : "py-4";

  const toggleSort = (key: CatalogueSortKey) => {
    if (sortBy === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDirection("asc");
  };

  if (!canReadCatalogue) {
    return <AdminAccessNotice title="Catalogue restricted" description="Your role does not include catalogue access." />;
  }

  return (
    <Card className="overflow-hidden border-primary/10 shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 border-b border-border bg-muted/30 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Catalogue</h2>
            <p className="text-sm text-foreground/55">Browse products with pricing and stock health.</p>
          </div>
          <input
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="Search by name, code, or category"
            className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20 lg:max-w-sm"
          />
          <NativeSelect
            value={density}
            onChange={(e) => setDensity(e.target.value as "comfortable" | "compact")}
            size="compact"
            className="rounded-full py-2"
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </NativeSelect>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => toggleSort("name")}>
                    Product
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead>Code</TableHead>
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => toggleSort("casePrice")}>
                    Pricing
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => toggleSort("available")}>
                    Available
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => toggleSort("stockState")}>
                    Status
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className={rowPadding}>
                    <div>
                      <p className="font-semibold text-foreground">{product.name}</p>
                      <p className="text-xs text-foreground/50">
                        {product.category} • {product.pack}
                      </p>
                      {product.updatedAt ? <p className="text-xs text-foreground/40">Updated {formatDate(product.updatedAt)}</p> : null}
                    </div>
                  </TableCell>
                  <TableCell className={`font-mono text-xs text-foreground/65 ${rowPadding}`}>{product.code}</TableCell>
                  <TableCell className={rowPadding}>
                    <p className="font-semibold text-foreground">{formatCurrency(product.casePrice)}</p>
                    <p className="text-xs text-foreground/50">{formatCurrency(product.unitPriceVat)}/unit incl. VAT</p>
                  </TableCell>
                  <TableCell className={rowPadding}>
                    <p className="font-semibold text-foreground">{product.available.toFixed(0)} cases</p>
                    <p className="text-xs text-foreground/50">Reorder at {product.reorderLevel.toFixed(0)}</p>
                  </TableCell>
                  <TableCell className={rowPadding}>
                    <Badge
                      className={
                        product.stockState === "Healthy"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : product.stockState === "Low"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                      }
                    >
                      {product.stockState}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!sortedProducts.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-foreground/55">
                    No catalogue lines match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


