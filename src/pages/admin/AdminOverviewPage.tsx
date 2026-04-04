import { useMemo } from "react";
import { hasAdminPermission } from "../../../shared/adminAccess";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminAccessNotice from "./AdminAccessNotice";
import { useAdminOutlet } from "./useAdminOutlet";
import { formatCurrency, formatDate, statusBadgeClasses } from "./adminFormat";

function shortenOrderReference(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 2)}....${value.slice(-5)}`;
}

function shortenEmail(value: string): string {
  if (!value) return "";
  const [localPart, domain = ""] = value.split("@");
  if (!domain) return `${value.slice(0, 4)}...`;
  const localShort = localPart.length > 2 ? `${localPart.slice(0, 2)}...` : localPart;
  const domainShort = domain.length > 2 ? `${domain.slice(0, 2)}...` : domain;
  return `${localShort}@${domainShort}`;
}

export default function AdminOverviewPage() {
  const { adminData, inventory, products, access } = useAdminOutlet();
  const canReadDashboard = hasAdminPermission(access, "dashboard.read");
  const canReadInventory = hasAdminPermission(access, "inventory.read");
  const canReadPayments = hasAdminPermission(access, "payments.read");


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

  const lowStock = useMemo(() => {
    if (!canReadInventory) return [];
    return products
      .map((p) => {
        const stock = inventoryByProduct.get(p.id);
        const available = stock?.available ?? 0;
        const reorderLevel = stock?.reorderLevel ?? 0;
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          code: p.code,
          pack: p.pack,
          available,
          reorderLevel,
          updatedAt: stock?.updatedAt ?? null,
        };
      })
      .filter((p) => p.available <= p.reorderLevel)
      .slice(0, 8);
  }, [canReadInventory, inventoryByProduct, products]);

  const latestPayments = useMemo(() => {
    return canReadPayments ? (adminData?.payments ?? []).slice(0, 6) : [];
  }, [adminData?.payments, canReadPayments]);

  if (!canReadDashboard) {
    return <AdminAccessNotice title="Overview restricted" description="Your role does not include the overview dashboard." />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden border-primary/10 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Stock pressure</h2>
                <p className="text-sm text-foreground/55">Lines closest to or below reorder level.</p>
              </div>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">{canReadInventory ? `${lowStock.length} attention` : "Restricted"}</Badge>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            {!canReadInventory ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-sm text-foreground/55 md:col-span-2">
                Your role can open the overview, but inventory pressure is hidden for this account.
              </div>
            ) : lowStock.length ? (
              lowStock.map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{p.category}</p>
                      <p className="mt-1 text-base font-bold text-foreground">{p.name}</p>
                      <p className="mt-1 text-sm text-foreground/50">
                        {p.code} • {p.pack}
                      </p>
                    </div>
                    <Badge className={p.available <= 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                      {p.available <= 0 ? "Out" : "Low"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{p.available.toFixed(0)}</p>
                      <p className="text-xs text-foreground/50">available cases</p>
                    </div>
                    <div className="text-right text-xs text-foreground/55">
                      <p>Reorder at {p.reorderLevel.toFixed(0)}</p>
                      <p>{p.updatedAt ? `Updated ${formatDate(p.updatedAt)}` : "No updates yet"}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-sm text-foreground/55 md:col-span-2">
                No low-stock lines right now.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/10 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="text-xl font-bold text-foreground">Payments pulse</h2>
            <p className="text-sm text-foreground/55">Latest payment activity.</p>
          </div>

          <div className="p-6">
            {!canReadPayments ? (
              <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm text-foreground/60">
                Payment activity is hidden for your current role.
              </div>
            ) : !latestPayments.length ? (
              <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm text-foreground/60">
                No payment records available yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="truncate max-w-[140px] font-semibold text-foreground" title={p.orderNumber}>
                          {shortenOrderReference(p.orderNumber)}
                        </p>
                        <p className="truncate max-w-[120px] text-xs text-foreground/50" title={p.customerEmail ?? "Guest checkout"}>
                          {p.customerEmail ? shortenEmail(p.customerEmail) : "Guest checkout"}
                        </p>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClasses(p.paymentStatus)}>{p.paymentStatus.replace(/_/g, " ")}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

