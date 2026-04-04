<<<<<<< HEAD
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

const PAGE_SIZE = 10;

const AdminDashboard = () => {
  const { session, loading: authLoading } = useAuth();
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(0);
  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [inventoryPage, setInventoryPage] = useState(0);

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

  const filteredPayments = useMemo(() => {
    if (!adminData?.payments) return [];
    if (paymentStatusFilter === "all") return adminData.payments;
    return adminData.payments.filter((payment) => {
      const status = payment.paymentStatus.toLowerCase();
      if (paymentStatusFilter === "paid") return status === "paid";
      if (paymentStatusFilter === "pending") return status.includes("pending") || status === "sent" || status === "initiated";
      if (paymentStatusFilter === "failed") return status === "failed" || status === "cancelled" || status === "expired";
      return true;
    });
  }, [adminData?.payments, paymentStatusFilter]);

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
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
                className="border border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Refresh page
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
                Refresh data
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
                            <p className="mt-1 text-sm text-foreground/50">{product.code} â€¢ {product.pack}</p>
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
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Payments pulse</h2>
                      <p className="text-sm text-foreground/55">Latest payment activity.</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-accent" onClick={() => document.querySelector('[data-value="payments"]')?.dispatchEvent(new MouseEvent('click', {bubbles: true}))}>
                      View all â†’
                    </Button>
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
                    ) : adminData?.payments.length ? adminData.payments.slice(0, 3).map((payment) => (
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

          <TabsContent value="catalogue" className="space-y-4">
            {/* Products - pending full rewrite */}
            <Card className="overflow-hidden border-primary/10">
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Products</h2>
                    <p className="text-xs text-foreground/55">Pricing, stock & locations.</p>
                  </div>
                  <input
                    value={productSearch}
                    onChange={(event) => { setProductSearch(event.target.value); setProductPage(0); }}
                    placeholder="Search by name, code, or category"
                    className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20 lg:max-w-sm"
                  />
                </div>
                <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-muted/20">
                  <div className="text-sm text-foreground/60">
                    {filteredProducts.length} items â€¢ Page {productPage + 1}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={productPage === 0} onClick={() => setProductPage(p => p - 1)}>Prev</Button>
                    <Button variant="outline" size="sm" disabled={(productPage + 1) * PAGE_SIZE >= filteredProducts.length} onClick={() => setProductPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8">Product</TableHead>
                      <TableHead className="h-8">Code</TableHead>
                      <TableHead className="h-8">Pricing</TableHead>
                      <TableHead className="h-8">Available</TableHead>
                      <TableHead className="h-8">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.slice(productPage * PAGE_SIZE, (productPage + 1) * PAGE_SIZE).map((product) => (
                      <TableRow key={product.id} className="h-10">
                        <TableCell className="py-1">
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-xs text-foreground/50">{product.category} â€¢ {product.pack}</p>
                        </TableCell>
                        <TableCell className="py-1 font-mono text-xs text-foreground/65">{product.code}</TableCell>
                        <TableCell className="py-1">
                          <p className="font-semibold">{formatCurrency(product.casePrice)}</p>
                          <p className="text-xs text-foreground/50">{formatCurrency(product.unitPriceVat)}/unit</p>
                        </TableCell>
                        <TableCell className="py-1">
                          <p className="font-semibold">{product.available.toFixed(0)}</p>
                          <p className="text-xs text-foreground/50">Reorder {product.reorderLevel.toFixed(0)}</p>
                        </TableCell>
                        <TableCell className="py-1">
                          <Badge className={product.stockState === "Healthy" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : product.stockState === "Low stock" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"}>
                            {product.stockState}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredProducts.length && !catalogLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-foreground/55">No matching products.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {/* Location breakdown from inventory data */}
            <Card className="overflow-hidden border-primary/10">
              <CardContent className="p-0">
                <div className="border-b border-border bg-muted/30 px-6 py-3">
                  <h2 className="text-lg font-bold text-foreground">Stock by location</h2>
                  <p className="text-xs text-foreground/55">Available inventory at each location.</p>
                </div>
                <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-muted/20">
                  <div className="text-sm text-foreground/60">{inventory.length} rows â€¢ Page {inventoryPage + 1}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={inventoryPage === 0} onClick={() => setInventoryPage(p => p - 1)}>Prev</Button>
                    <Button variant="outline" size="sm" disabled={(inventoryPage + 1) * PAGE_SIZE >= inventory.length} onClick={() => setInventoryPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8">Product</TableHead>
                      <TableHead className="h-8">Location</TableHead>
                      <TableHead className="h-8">On Hand</TableHead>
                      <TableHead className="h-8">Reserved</TableHead>
                      <TableHead className="h-8">Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.slice(inventoryPage * PAGE_SIZE, (inventoryPage + 1) * PAGE_SIZE).map((row) => (
                      <TableRow key={`${row.product_id}-${row.location_code}`} className="h-10">
                        <TableCell className="py-1 font-semibold">{row.name}</TableCell>
                        <TableCell className="py-1 text-xs uppercase text-primary">{row.location_code}</TableCell>
                        <TableCell className="py-1">{row.on_hand_cases.toFixed(0)}</TableCell>
                        <TableCell className="py-1">{row.reserved_cases.toFixed(0)}</TableCell>
                        <TableCell className="py-1">
                          <Badge className={row.available_cases <= row.reorder_level_cases ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                            {row.available_cases.toFixed(0)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!inventory.length && !inventoryLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-foreground/55">No inventory data.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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

                {/* Status and date filters */}
                {session?.access_token && (
                  <div className="flex flex-wrap gap-3 px-6 py-3 border-b border-border bg-muted/20 items-center">
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => { setPaymentStatusFilter(e.target.value); setPaymentPage(0); }}
                      className="rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm"
                    >
                      <option value="all">All statuses</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed/Cancelled</option>
                    </select>
                    <input type="date" placeholder="From date" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    <input type="date" placeholder="To date" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    <Button variant="outline" size="sm" className="border-primary/20">
                      Filter
                    </Button>
                    <Button variant="ghost" size="sm" className="ml-auto text-accent">
                      Export CSV
                    </Button>
                  </div>
                )}

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
                  <>
                    {/* Compact pagination controls */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/20">
                      <div className="text-sm text-foreground/60">
                        {filteredPayments.length} total â€¢ Showing {paymentPage * PAGE_SIZE + 1}-{Math.min((paymentPage + 1) * PAGE_SIZE, filteredPayments.length)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={paymentPage === 0}
                          onClick={() => setPaymentPage(p => p - 1)}
                        >
                          Prev
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={(paymentPage + 1) * PAGE_SIZE >= filteredPayments.length}
                          onClick={() => setPaymentPage(p => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payer</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments
                          .slice(paymentPage * PAGE_SIZE, (paymentPage + 1) * PAGE_SIZE)
                          .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <p className="font-semibold text-foreground">{payment.customerEmail ?? "Guest"}</p>
                            <p className="text-xs text-foreground/50">{formatDate(payment.createdAt)}</p>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{payment.orderNumber}</TableCell>
                          <TableCell className="font-mono text-xs text-foreground/65">{payment.reference}</TableCell>
                          <TableCell className="font-semibold text-foreground">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <Badge className={statusBadgeClasses(payment.paymentStatus)}>{payment.paymentStatus.replace(/_/g, " ")}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                        {!filteredPayments.length && (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center text-sm text-foreground/55">
                              No payment records match the selected filter.
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                  </>
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
=======
import AdminLayout from "./admin/AdminLayout";
>>>>>>> 7f2e911 (admin dash patch)

// Backwards-compatible entrypoint for older links.
export default AdminLayout;



