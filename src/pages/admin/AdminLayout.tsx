import { useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Boxes, CreditCard, PackageSearch, Store, Warehouse } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useCatalog } from "@/hooks/useCatalog";
import { useAdminInventorySnapshot } from "@/hooks/useAdminInventorySnapshot";
import { fetchAdminDashboard } from "@/lib/admin";
import { AuthDialog } from "@/components/AuthDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminWorkspaceData } from "./adminTypes";
import { formatCurrency } from "./adminFormat";

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted hover:text-foreground",
  ].join(" ");
}

export default function AdminLayout() {
  const { session, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const { data: products = [], isLoading: catalogLoading, refetch: refetchCatalog } = useCatalog();
  const { data: inventoryRaw = [], isLoading: inventoryLoading, refetch: refetchInventory } = useAdminInventorySnapshot(session?.access_token ?? null);

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

  const showSignIn = !authLoading && (!session?.access_token || !!paymentsError);
  const isBooting = authLoading || catalogLoading || inventoryLoading || paymentsLoading;

  const inventory = useMemo(() => {
    return inventoryRaw.map((row) => ({
      product_id: row.productId,
      name: row.name,
      location_code: row.locationCode,
      location_name: row.locationName,
      on_hand_cases: row.onHandCases,
      reserved_cases: row.reservedCases,
      available_cases: row.availableCases,
      reorder_level_cases: row.reorderLevelCases,
      updated_at: row.updatedAt,
    }));
  }, [inventoryRaw]);

  const overview = useMemo(() => {
    const totalOnHand = inventory.reduce((sum, row) => sum + row.on_hand_cases, 0);
    const totalReserved = inventory.reduce((sum, row) => sum + row.reserved_cases, 0);
    const locations = new Set(inventory.map((r) => r.location_code));

    return {
      products: products.length,
      onHand: totalOnHand,
      reserved: totalReserved,
      locations: locations.size,
      revenue: adminData?.summary.totalRevenue ?? 0,
      paidOrders: adminData?.summary.paidOrders ?? 0,
    };
  }, [adminData?.summary.paidOrders, adminData?.summary.totalRevenue, inventory, products.length]);

  const refetchAll = () => {
    void refetchCatalog();
    void refetchInventory();
    void refetchPayments();
  };

  if (isBooting) {
    return (
      <main className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="rounded-2xl border border-border bg-card px-6 py-5 text-sm text-foreground/70 shadow-sm">
          Loading admin workspace...
        </div>
      </main>
    );
  }

  if (showSignIn) {
    return (
      <main className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Admin</CardTitle>
            <CardDescription>Sign in with an approved admin account to access operations.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <Button asChild variant="secondary">
              <Link to="/">
                <Store className="mr-2 h-4 w-4" />
                Store
              </Link>
            </Button>
            <Button onClick={() => setAuthOpen(true)} className="brand-gradient text-white">
              Sign in
            </Button>
            <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
          </CardContent>
        </Card>
      </main>
    );
  }

  const ctx: AdminWorkspaceData = {
    accessToken: session?.access_token ?? null,
    products: products as AdminWorkspaceData["products"],
    inventory,
    adminData,
    paymentsLoading,
    paymentsError,
    refetchAll,
  };

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">Admin</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Operations</h1>
            <p className="mt-1 text-sm text-foreground/60">Inventory, catalogue, and payments — in one workspace.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary">
              <Link to="/">
                <Store className="mr-2 h-4 w-4" />
                Store
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-primary/10 p-2">
                  <PackageSearch className="h-4 w-4 text-primary" />
                </div>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-accent">
                  Live
                </Badge>
              </div>
              <p className="text-sm text-foreground/60">Catalogue lines</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{overview.products}</p>
              <p className="mt-1 text-xs text-foreground/50">Active products in the storefront</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-primary/10 p-2">
                  <Warehouse className="h-4 w-4 text-primary" />
                </div>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-accent">
                  Live
                </Badge>
              </div>
              <p className="text-sm text-foreground/60">Cases on hand</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{overview.onHand.toFixed(0)}</p>
              <p className="mt-1 text-xs text-foreground/50">{overview.reserved.toFixed(0)} cases reserved</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-primary/10 p-2">
                  <Boxes className="h-4 w-4 text-primary" />
                </div>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-accent">
                  Live
                </Badge>
              </div>
              <p className="text-sm text-foreground/60">Locations tracked</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{overview.locations}</p>
              <p className="mt-1 text-xs text-foreground/50">Warehouses & selling points</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-primary/10 p-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-accent">
                  Live
                </Badge>
              </div>
              <p className="text-sm text-foreground/60">Revenue collected</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(overview.revenue)}</p>
              <p className="mt-1 text-xs text-foreground/50">{overview.paidOrders} paid orders</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
              <nav className="space-y-1">
                <NavLink to="/admin/overview" className={navLinkClassName}>
                  <Warehouse className="h-4 w-4" />
                  Overview
                </NavLink>
                <NavLink to="/admin/catalogue" className={navLinkClassName}>
                  <PackageSearch className="h-4 w-4" />
                  Catalogue
                </NavLink>
                <NavLink to="/admin/inventory" className={navLinkClassName}>
                  <Boxes className="h-4 w-4" />
                  Inventory
                </NavLink>
                <NavLink to="/admin/payments" className={navLinkClassName}>
                  <CreditCard className="h-4 w-4" />
                  Payments
                </NavLink>
              </nav>
            </div>
          </aside>

          <section className="space-y-6">
            <Outlet context={ctx} />
          </section>
        </div>
      </div>
    </main>
  );
}

