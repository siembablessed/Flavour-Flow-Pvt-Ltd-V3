import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Product } from "@/data/products";
import type { InventorySnapshotRow } from "@/hooks/useInventorySnapshot";
import {
  createInventoryMovement,
  fetchAdminInventoryMovements,
  updateReorderLevel,
  type InventoryMovementInput,
} from "@/lib/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const movementLabels: Record<InventoryMovementInput["movementType"], string> = {
  stock_in: "Receive stock",
  stock_out: "Dispatch stock",
  reserve: "Reserve stock",
  release: "Release reservation",
  adjustment_plus: "Adjustment +",
  adjustment_minus: "Adjustment -",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface AdminInventoryManagerProps {
  accessToken: string | null;
  products: Product[];
  inventory: InventorySnapshotRow[];
  onInventoryChanged: () => void;
}

const AdminInventoryManager = ({ accessToken, products, inventory, onInventoryChanged }: AdminInventoryManagerProps) => {
  const queryClient = useQueryClient();
  const locations = useMemo(
    () => Array.from(new Map(inventory.map((row) => [row.location_code, row.location_name])).entries()).map(([code, name]) => ({ code, name })),
    [inventory],
  );

  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [locationCode, setLocationCode] = useState(locations[0]?.code ?? "");
  const [movementType, setMovementType] = useState<InventoryMovementInput["movementType"]>("stock_in");
  const [quantityCases, setQuantityCases] = useState("1");
  const [note, setNote] = useState("");
  const [reorderLevelCases, setReorderLevelCases] = useState("0");

  useEffect(() => {
    if (!productId && products[0]?.id) {
      setProductId(products[0].id);
    }
  }, [productId, products]);

  useEffect(() => {
    if (!locationCode && locations[0]?.code) {
      setLocationCode(locations[0].code);
    }
  }, [locationCode, locations]);

  const selectedInventoryRow = useMemo(
    () => inventory.find((row) => row.product_id === productId && row.location_code === locationCode) ?? null,
    [inventory, locationCode, productId],
  );

  useEffect(() => {
    if (selectedInventoryRow) {
      setReorderLevelCases(String(selectedInventoryRow.reorder_level_cases));
    }
  }, [selectedInventoryRow]);

  const movementsQuery = useQuery({
    queryKey: ["admin-inventory-movements", accessToken],
    queryFn: () => fetchAdminInventoryMovements(accessToken!),
    enabled: Boolean(accessToken),
    retry: false,
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-inventory-movements"] }),
    ]);
    onInventoryChanged();
  };

  const movementMutation = useMutation({
    mutationFn: (input: InventoryMovementInput) => createInventoryMovement(accessToken!, input),
    onSuccess: async (result) => {
      toast.success(result.message);
      setQuantityCases("1");
      setNote("");
      await refreshAll();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to record inventory movement");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (input: { productId: string; locationCode: string; reorderLevelCases: number }) => updateReorderLevel(accessToken!, input),
    onSuccess: async (result) => {
      toast.success(result.message);
      await refreshAll();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update reorder level");
    },
  });

  const handleMovementSubmit = () => {
    if (!accessToken) {
      toast.error("Sign in with an admin account to manage inventory");
      return;
    }

    const quantity = Number(quantityCases);
    if (!productId || !locationCode || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Choose a product, location, and a valid quantity");
      return;
    }

    movementMutation.mutate({
      movementType,
      productId,
      locationCode,
      quantityCases: quantity,
      note: note.trim() || null,
    });
  };

  const handleReorderSubmit = () => {
    if (!accessToken) {
      toast.error("Sign in with an admin account to manage inventory");
      return;
    }

    const reorderLevel = Number(reorderLevelCases);
    if (!productId || !locationCode || !Number.isFinite(reorderLevel) || reorderLevel < 0) {
      toast.error("Choose a product, location, and a valid reorder level");
      return;
    }

    reorderMutation.mutate({
      productId,
      locationCode,
      reorderLevelCases: reorderLevel,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/10">
        <CardContent className="p-0">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="text-xl font-bold text-foreground">Inventory controls</h2>
            <p className="text-sm text-foreground/55">Receive, dispatch, reserve, release, and adjust stock without leaving the dashboard.</p>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground">Record stock movement</h3>
              <div className="mt-4 grid gap-4">
                <label className="grid gap-2 text-sm">
                  <span className="text-foreground/65">Product</span>
                  <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2.5">
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name} · {product.code}</option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="text-foreground/65">Location</span>
                    <select value={locationCode} onChange={(e) => setLocationCode(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2.5">
                      {locations.map((location) => (
                        <option key={location.code} value={location.code}>{location.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="text-foreground/65">Movement</span>
                    <select value={movementType} onChange={(e) => setMovementType(e.target.value as InventoryMovementInput["movementType"])} className="rounded-xl border border-border bg-background px-3 py-2.5">
                      {Object.entries(movementLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-2 text-sm">
                  <span className="text-foreground/65">Quantity in cases</span>
                  <input value={quantityCases} onChange={(e) => setQuantityCases(e.target.value)} type="number" min="0.001" step="0.001" className="rounded-xl border border-border bg-background px-3 py-2.5" />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="text-foreground/65">Note</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="rounded-xl border border-border bg-background px-3 py-2.5" placeholder="Optional note for the movement log" />
                </label>

                <Button onClick={handleMovementSubmit} disabled={movementMutation.isPending || !products.length || !locations.length} className="brand-gradient text-white hover:opacity-95">
                  {movementMutation.isPending ? "Saving movement..." : "Save movement"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground">Set reorder level</h3>
              <p className="mt-2 text-sm text-foreground/55">Control when a line becomes low stock for each location.</p>

              <div className="mt-4 grid gap-4">
                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-foreground/70">
                  <p>Current on hand: <span className="font-semibold text-foreground">{selectedInventoryRow?.on_hand_cases.toFixed(0) ?? "0"}</span></p>
                  <p>Current reserved: <span className="font-semibold text-foreground">{selectedInventoryRow?.reserved_cases.toFixed(0) ?? "0"}</span></p>
                  <p>Available now: <span className="font-semibold text-foreground">{selectedInventoryRow?.available_cases.toFixed(0) ?? "0"}</span></p>
                </div>

                <label className="grid gap-2 text-sm">
                  <span className="text-foreground/65">Reorder level in cases</span>
                  <input value={reorderLevelCases} onChange={(e) => setReorderLevelCases(e.target.value)} type="number" min="0" step="1" className="rounded-xl border border-border bg-background px-3 py-2.5" />
                </label>

                <Button onClick={handleReorderSubmit} disabled={reorderMutation.isPending || !products.length || !locations.length} variant="outline" className="border-primary/20 bg-primary/5 text-accent hover:bg-primary/10">
                  {reorderMutation.isPending ? "Updating level..." : "Update reorder level"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/10">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Recent inventory movements</h2>
              <p className="text-sm text-foreground/55">Latest stock changes across all tracked locations.</p>
            </div>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-accent">
              {(movementsQuery.data ?? []).length} recent events
            </Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Movement</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movementsQuery.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs text-foreground/60">{formatDate(row.createdAt)}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-foreground">{row.productName}</p>
                    <p className="text-xs text-foreground/50">{row.productCode}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-foreground">{row.locationName}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-primary">{row.locationCode}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className="border-primary/20 bg-primary/5 text-accent">{movementLabels[row.movementType]}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">{row.quantityCases.toFixed(3)}</TableCell>
                  <TableCell className="text-sm text-foreground/60">{row.note ?? "-"}</TableCell>
                </TableRow>
              ))}
              {!movementsQuery.isLoading && !(movementsQuery.data ?? []).length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-foreground/55">
                    No inventory movements have been recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInventoryManager;
