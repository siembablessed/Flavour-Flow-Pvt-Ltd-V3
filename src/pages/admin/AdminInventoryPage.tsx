import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import AdminInventoryManager from "@/components/AdminInventoryManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminOutlet } from "./useAdminOutlet";
import { formatDate } from "./adminFormat";
import type { InventorySnapshotRow } from "@/hooks/useInventorySnapshot";

type InventorySortKey = "name" | "location" | "onHand" | "reserved" | "available";

export default function AdminInventoryPage() {
  const { inventory, products, accessToken, refetchAll } = useAdminOutlet();
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventorySearch, setInventorySearch] = useState("");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sortBy, setSortBy] = useState<InventorySortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [locationsPage, setLocationsPage] = useState(1);

  const locations = useMemo(() => {
    const grouped = new Map<string, { name: string; lines: number; available: number; reserved: number }>();
    for (const row of inventory) {
      const current = grouped.get(row.location_code) ?? {
        name: row.location_name,
        lines: 0,
        available: 0,
        reserved: 0,
      };
      current.lines += 1;
      current.available += row.available_cases;
      current.reserved += row.reserved_cases;
      grouped.set(row.location_code, current);
    }
    return Array.from(grouped.entries()).map(([code, value]) => ({ code, ...value }));
  }, [inventory]);

  const locationsPageSize = 8;
  const totalLocationsPages = Math.max(1, Math.ceil(locations.length / locationsPageSize));
  const locationsPageRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, locationsPage), totalLocationsPages);
    const start = (safePage - 1) * locationsPageSize;
    return locations.slice(start, start + locationsPageSize);
  }, [locations, locationsPage, totalLocationsPages]);

  const filteredInventoryRows = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    if (!query) return inventory;
    return inventory.filter((row) =>
      [row.name, row.product_id, row.location_name, row.location_code].some((field) => String(field ?? "").toLowerCase().includes(query)),
    );
  }, [inventory, inventorySearch]);

  const sortedInventoryRows = useMemo(() => {
    const list = [...filteredInventoryRows];
    list.sort((a, b) => {
      let delta = 0;
      if (sortBy === "name") delta = a.name.localeCompare(b.name);
      if (sortBy === "location") delta = a.location_name.localeCompare(b.location_name);
      if (sortBy === "onHand") delta = a.on_hand_cases - b.on_hand_cases;
      if (sortBy === "reserved") delta = a.reserved_cases - b.reserved_cases;
      if (sortBy === "available") delta = a.available_cases - b.available_cases;
      return sortDirection === "asc" ? delta : -delta;
    });
    return list;
  }, [filteredInventoryRows, sortBy, sortDirection]);

  const inventoryPageSize = density === "compact" ? 16 : 8;
  const totalInventoryPages = Math.max(1, Math.ceil(filteredInventoryRows.length / inventoryPageSize));
  const inventoryPageRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, inventoryPage), totalInventoryPages);
    const start = (safePage - 1) * inventoryPageSize;
    return sortedInventoryRows.slice(start, start + inventoryPageSize);
  }, [sortedInventoryRows, inventoryPage, totalInventoryPages, inventoryPageSize]);

  const rowPadding = density === "compact" ? "py-2" : "py-4";

  const toggleSort = (key: InventorySortKey) => {
    if (sortBy === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDirection("asc");
  };

  return (
    <div className="space-y-6">
      <AdminInventoryManager
        accessToken={accessToken}
        products={products}
        inventory={inventory as unknown as InventorySnapshotRow[]}
        onInventoryChanged={refetchAll}
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="overflow-hidden border-primary/10 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border bg-muted/30 px-6 py-4">
              <h2 className="text-xl font-bold text-foreground">Locations</h2>
              <p className="text-sm text-foreground/55">Inventory coverage across active storage points.</p>
            </div>
            <div className="space-y-3 p-6">
              {locationsPageRows.map((location) => (
                <div key={location.code} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{location.name}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-primary">{location.code}</p>
                    </div>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-accent">
                      {location.lines} SKUs
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-foreground/50">Available</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{location.available.toFixed(0)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-foreground/50">Reserved</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{location.reserved.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!locations.length && (
                <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm text-foreground/60">
                  No inventory locations are available yet.
                </div>
              )}
            </div>
            {locations.length > locationsPageSize ? (
              <div className="flex flex-col gap-3 border-t border-border bg-muted/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-foreground/55">
                  {(() => {
                    const start = (locationsPage - 1) * locationsPageSize;
                    const end = start + locationsPageRows.length;
                    const remaining = Math.max(0, locations.length - end);
                    return `Showing ${Math.min(start + 1, locations.length)}-${end} of ${locations.length} • ${remaining} left`;
                  })()}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" disabled={locationsPage <= 1} onClick={() => setLocationsPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-accent">
                    Page {Math.min(locationsPage, totalLocationsPages)} / {totalLocationsPages}
                  </Badge>
                  <Button
                    variant="secondary"
                    disabled={locationsPage >= totalLocationsPages}
                    onClick={() => setLocationsPage((p) => Math.min(totalLocationsPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/10 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border bg-muted/30 px-6 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Inventory snapshot</h2>
                  <p className="text-sm text-foreground/55">On-hand, reserved, and available quantities by location.</p>
                </div>
                <input
                  value={inventorySearch}
                  onChange={(event) => {
                    setInventorySearch(event.target.value);
                    setInventoryPage(1);
                  }}
                  placeholder="Search product or location"
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20 lg:max-w-sm"
                />
                <select
                  value={density}
                  onChange={(e) => setDensity(e.target.value as "comfortable" | "compact")}
                  className="rounded-full border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </div>
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
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("location")}>
                      Location
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("onHand")}>
                      On hand
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("reserved")}>
                      Reserved
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("available")}>
                      Available
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryPageRows.map((row) => (
                  <TableRow key={`${row.product_id}-${row.location_code}`}>
                    <TableCell className={rowPadding}>
                      <p className="font-semibold text-foreground">{row.name}</p>
                      <p className="text-xs text-foreground/50">Updated {formatDate(row.updated_at)}</p>
                    </TableCell>
                    <TableCell className={rowPadding}>
                      <p className="font-semibold text-foreground">{row.location_name}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-primary">{row.location_code}</p>
                    </TableCell>
                    <TableCell className={rowPadding}>{row.on_hand_cases.toFixed(0)}</TableCell>
                    <TableCell className={rowPadding}>{row.reserved_cases.toFixed(0)}</TableCell>
                    <TableCell className={rowPadding}>
                      <Badge className={row.available_cases <= row.reorder_level_cases ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                        {row.available_cases.toFixed(0)} cases
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredInventoryRows.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-foreground/55">
                      No inventory rows match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>

            <div className="flex flex-col gap-3 border-t border-border bg-muted/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-foreground/55">
                {(() => {
                  const start = (inventoryPage - 1) * inventoryPageSize;
                  const end = start + inventoryPageRows.length;
                  const remaining = Math.max(0, filteredInventoryRows.length - end);
                  return `Showing ${Math.min(start + 1, filteredInventoryRows.length)}-${end} of ${filteredInventoryRows.length} • ${remaining} left`;
                })()}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" disabled={inventoryPage <= 1} onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-accent">
                  Page {Math.min(inventoryPage, totalInventoryPages)} / {totalInventoryPages}
                </Badge>
                <Button
                  variant="secondary"
                  disabled={inventoryPage >= totalInventoryPages}
                  onClick={() => setInventoryPage((p) => Math.min(totalInventoryPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

