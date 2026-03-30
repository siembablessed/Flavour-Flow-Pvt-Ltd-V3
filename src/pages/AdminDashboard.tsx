import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  CreditCard,
  LayoutDashboard,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/logo.png";
import { useCatalog } from "@/hooks/useCatalog";
import { useInventorySnapshot } from "@/hooks/useInventorySnapshot";
import { useAuth } from "@/context/AuthContext";
import { fetchAdminDashboard } from "@/lib/admin";
import AdminInventoryManager from "@/components/AdminInventoryManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Not paid yet";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusBadgeClasses(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized.includes("pending") || normalized === "sent" || normalized === "initiated") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-rose-50 text-rose-700 border-rose-200";
}

const AdminDashboard = () => {
  const { session, loading: authLoading } = useAuth();
  const [productSearch, setProductSearch] = useState("");

  const {
    data: products = [],
    isLoading: catalogLoading,
    refetch: refetchCatalog,
  } = useCatalog();
  const {
    data: inventory = [],
    isLoading: inventoryLoading,
    refetch: refetchInventory,
  } = useInventorySnapshot();
  const {
    data: adminData,
    isLoading: paymentsLoading,
    error: paymentsError,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ["admin-dashboard", session?.access_token],
    queryFn: () => fetchAdminDashboard(session!.access_token),
    enabled: Boolean(session?.access_token),
    retry: false,
  });

  const inventoryByProduct = useMemo(() => {
    const map = new Map<string, { onHand: number; reserved: number; available: number; reorderLevel: number; updatedAt: string }>();
    for (const row of inventory) {
      const current = map.get(row.product_id) ?? {
        onHand: 0,
        reserved: 0,
        available: 0,
        reorderLevel: 0,
        updatedAt: row.updated_at,
      };

      current.onHand += row.on_hand_cases;
      current.reserved += row.reserved_cases;
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
        const stockState = available <= 0 ? "Out of stock" : available <= reorderLevel ? "Low stock" : "Healthy";
        return {
          ...product,
          available,
          reorderLevel,
          stockState,
          updatedAt: stock?.updatedAt ?? null,
        };
      });
  }, [inventoryByProduct, productSearch, products]);

  const lowStockItems = useMemo(
    () => filteredProducts.filter((product) => product.available <= product.reorderLevel).slice(0, 8),
    [filteredProducts],
  );

  const locationSummary = useMemo(() => {
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

  const overviewStats = useMemo(() => {
    const totalOnHand = inventory.reduce((sum, row) => sum + row.on_hand_cases, 0);
    const totalReserved = inventory.reduce((sum, row) => sum + row.reserved_cases, 0);

    return [
      {
        label: "Catalogue lines",
        value: products.length.toString(),
        hint: "Live products in the storefront",
        icon: PackageSearch,
      },
      {
        label: "Cases on hand",
        value: totalOnHand.toFixed(0),
        hint: `${totalReserved.toFixed(0)} cases reserved`,
        icon: Warehouse,
      },
      {
        label: "Locations tracked",
        value: locationSummary.length.toString(),
        hint: "Warehouses and selling points",
        icon: Boxes,
      },
      {
        label: "Revenue collected",
        value: formatCurrency(adminData?.summary.totalRevenue ?? 0),
        hint: `${adminData?.summary.paidOrders ?? 0} paid orders`,
        icon: CreditCard,
      },
    ];
  }, [adminData?.summary.paidOrders, adminData?.summary.totalRevenue, inventory, locationSummary.length, products.length]);

  const isBooting = authLoading || catalogLoading || inventoryLoading;

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#17346b] to-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,151,20,0.28),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="relative mx-auto flex max-w-[1800px] flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex flex-col gap-5 rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Flavour Flow" className="h-16 w-auto sm:h-20" />
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/75">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Admin side
                </div>
                <h1 className="text-3xl font-bold sm:text-4xl">Operations dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
                  Manage catalogue visibility, monitor inventory pressure, and review who has paid without leaving the brand language of the storefront.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="secondary" className="border border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to store
                </Link>
              </Button>
              <Button
                onClick={() => {
                  void refetchCatalog();
                  void refetchInventory();
                  void refetchPayments();
                }}
                className="brand-gradient text-white hover:opacity-95"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh admin data
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewStats.map((stat) => (
              <Card key={stat.label} className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur">
                <CardContent className="p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <LayoutDashboard className="h-4 w-4 text-white/35" />
                  </div>
                  <p className="text-sm text-white/70">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                  <p className="mt-2 text-xs text-white/55">{stat.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="h-auto flex-wrap gap-2 rounded-2xl bg-muted/60 p-2">
            <TabsTrigger value="overview" className="rounded-xl px-4 py-2">Overview</TabsTrigger>
            <TabsTrigger value="catalogue" className="rounded-xl px-4 py-2">Catalogue</TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-xl px-4 py-2">Inventory</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-xl px-4 py-2">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="overflow-hidden border-primary/10">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Stock pressure</h2>
                      <p className="text-sm text-foreground/55">Products nearest to their reorder level.</p>
                    </div>
                    <Badge className="border-amber-200 bg-amber-50 text-amber-700">{lowStockItems.length} attention lines</Badge>
                  </div>

                  <div className="grid gap-4 p-6 md:grid-cols-2">
                    {lowStockItems.length > 0 ? lowStockItems.map((product) => (
                      <div key={product.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{product.category}</p>
                            <h3 className="mt-1 text-base font-bold text-foreground">{product.name}</h3>
                            <p className="mt-1 text-sm text-foreground/50">{product.code} • {product.pack}</p>
                          </div>
                          <Badge className={product.available <= 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                            {product.stockState}
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-end justify-between">
                          <div>
                            <p className="text-2xl font-bold text-foreground">{product.available.toFixed(0)}</p>
                            <p className="text-xs text-foreground/50">available cases</p>
                          </div>
                          <div className="text-right text-xs text-foreground/55">
                            <p>Reorder at {product.reorderLevel.toFixed(0)}</p>
                            <p>{product.updatedAt ? `Updated ${formatDate(product.updatedAt)}` : "No stock updates yet"}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-sm text-foreground/55 md:col-span-2">
                        No low-stock lines matched the current catalogue.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-primary/10">
                <CardContent className="p-0">
                  <div className="border-b border-border bg-muted/30 px-6 py-4">
                    <h2 className="text-xl font-bold text-foreground">Payments pulse</h2>
                    <p className="text-sm text-foreground/55">Latest payment activity at a glance.</p>
                  </div>

                  <div className="space-y-3 p-6">
                    {!session?.access_token ? (
                      <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm text-foreground/60">
                        Sign in with an admin account to view payment activity.
                      </div>
                    ) : paymentsLoading ? (
                      <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm text-foreground/60">
                        Loading payment activity...
                      </div>
                    ) : paymentsError ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                        {(paymentsError as Error).message}
                      </div>
                    ) : adminData?.payments.length ? adminData.payments.slice(0, 6).map((payment) => (
                      <div key={payment.id} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-foreground">{payment.orderNumber}</p>
                            <p className="mt-1 text-xs text-foreground/55">{payment.customerEmail ?? "Guest checkout"}</p>
                          </div>
                          <Badge className={statusBadgeClasses(payment.paymentStatus)}>{payment.paymentStatus.replace(/_/g, " ")}</Badge>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="font-semibold text-foreground">{formatCurrency(payment.amount)}</span>
                          <span className="text-foreground/55">{payment.paymentMethod ?? "Paynow"}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm text-foreground/60">
                        No payment records available yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="catalogue" className="space-y-6">
            <Card className="overflow-hidden border-primary/10">
              <CardContent className="p-0">
                <div className="flex flex-col gap-4 border-b border-border bg-muted/30 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Catalogue management</h2>
                    <p className="text-sm text-foreground/55">Browse active product lines with pricing and stock health in one place.</p>
                  </div>
                  <input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Search by name, code, or category"
                    className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20 lg:max-w-sm"
                  />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground">{product.name}</p>
                            <p className="text-xs text-foreground/50">{product.category} • {product.pack}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-foreground/65">{product.code}</TableCell>
                        <TableCell>
                          <p className="font-semibold text-foreground">{formatCurrency(product.casePrice)}</p>
                          <p className="text-xs text-foreground/50">{formatCurrency(product.unitPriceVat)}/unit incl. VAT</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-foreground">{product.available.toFixed(0)} cases</p>
                          <p className="text-xs text-foreground/50">Reorder at {product.reorderLevel.toFixed(0)}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={product.stockState === "Healthy" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : product.stockState === "Low stock" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"}>
                            {product.stockState}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredProducts.length && !catalogLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-foreground/55">
                          No catalogue lines match your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <AdminInventoryManager
              accessToken={session?.access_token ?? null}
              products={products}
              inventory={inventory}
              onInventoryChanged={() => {
                void refetchInventory();
              }}
            />
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <Card className="overflow-hidden border-primary/10">
                <CardContent className="p-0">
                  <div className="border-b border-border bg-muted/30 px-6 py-4">
                    <h2 className="text-xl font-bold text-foreground">Locations</h2>
                    <p className="text-sm text-foreground/55">Inventory coverage across active storage points.</p>
                  </div>
                  <div className="space-y-3 p-6">
                    {locationSummary.map((location) => (
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
                    {!locationSummary.length && !inventoryLoading && (
                      <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm text-foreground/60">
                        No inventory locations are available yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-primary/10">
                <CardContent className="p-0">
                  <div className="border-b border-border bg-muted/30 px-6 py-4">
                    <h2 className="text-xl font-bold text-foreground">Inventory snapshot</h2>
                    <p className="text-sm text-foreground/55">Detailed on-hand, reserved, and available quantities by location.</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>On hand</TableHead>
                        <TableHead>Reserved</TableHead>
                        <TableHead>Available</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.slice(0, 18).map((row) => (
                        <TableRow key={`${row.product_id}-${row.location_code}`}>
                          <TableCell>
                            <p className="font-semibold text-foreground">{row.name}</p>
                            <p className="text-xs text-foreground/50">Updated {formatDate(row.updated_at)}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-foreground">{row.location_name}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-primary">{row.location_code}</p>
                          </TableCell>
                          <TableCell>{row.on_hand_cases.toFixed(0)}</TableCell>
                          <TableCell>{row.reserved_cases.toFixed(0)}</TableCell>
                          <TableCell>
                            <Badge className={row.available_cases <= row.reorder_level_cases ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                              {row.available_cases.toFixed(0)} cases
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!inventory.length && !inventoryLoading && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-sm text-foreground/55">
                            No inventory snapshot data is available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card className="overflow-hidden border-primary/10">
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Payment management</h2>
                    <p className="text-sm text-foreground/55">Track what has been paid, how it was paid, and who made the payment.</p>
                  </div>
                  {adminData && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{adminData.summary.paidOrders} paid</Badge>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200">{adminData.summary.pendingOrders} pending</Badge>
                      <Badge variant="outline" className="border-primary/20 bg-primary/5 text-accent">
                        {adminData.summary.totalCustomers} customers
                      </Badge>
                    </div>
                  )}
                </div>

                {!session?.access_token ? (
                  <div className="p-6">
                    <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-foreground/60">
                      Sign in first, then use an approved admin account to unlock payment reporting.
                    </div>
                  </div>
                ) : paymentsLoading ? (
                  <div className="p-6">
                    <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-foreground/60">
                      Loading payment records...
                    </div>
                  </div>
                ) : paymentsError ? (
                  <div className="p-6">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
                      {(paymentsError as Error).message}
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payer</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid at</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminData?.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <p className="font-semibold text-foreground">{payment.customerEmail ?? "Guest checkout"}</p>
                            <p className="text-xs text-foreground/50">{formatDate(payment.createdAt)}</p>
                          </TableCell>
                          <TableCell>{payment.orderNumber}</TableCell>
                          <TableCell className="font-mono text-xs text-foreground/65">{payment.reference}</TableCell>
                          <TableCell>{payment.paymentMethod ?? "Paynow"}</TableCell>
                          <TableCell className="font-semibold text-foreground">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <Badge className={statusBadgeClasses(payment.paymentStatus)}>{payment.paymentStatus.replace(/_/g, " ")}</Badge>
                              {payment.providerStatus ? (
                                <span className="text-xs text-foreground/45">Provider: {payment.providerStatus}</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(payment.paidAt)}</TableCell>
                        </TableRow>
                      ))}
                      {!adminData?.payments.length && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-sm text-foreground/55">
                            No payment records are available yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isBooting && (
          <div className="py-8 text-center text-sm text-foreground/55">
            Loading catalogue and inventory data...
          </div>
        )}
      </section>
    </main>
  );
};

export default AdminDashboard;


