import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Settings2, Wallet } from "lucide-react";
import { hasAdminPermission } from "../../../shared/adminAccess";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminAccessNotice from "./AdminAccessNotice";
import { useAdminOutlet } from "./useAdminOutlet";
import { formatCurrency, statusBadgeClasses } from "./adminFormat";

type PaymentSortKey = "createdAt" | "paidAt" | "amount" | "paymentStatus";

function paymentMethodLabel(value: string | null) {
  if (!value) return "Paynow";
  return value.replace(/_/g, " ");
}

function formatDateParts(value: string | null) {
  if (!value) {
    return {
      date: "Pending",
      time: "",
    };
  }

  const date = new Date(value);
  return {
    date: date.toLocaleDateString(undefined),
    time: date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export default function AdminPaymentsPage() {
  const { adminData, paymentsLoading, paymentsError, access } = useAdminOutlet();
  const canReadPayments = hasAdminPermission(access, "payments.read");

  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sortBy, setSortBy] = useState<PaymentSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const allPayments = useMemo(() => adminData?.payments ?? [], [adminData?.payments]);

  const filteredPayments = useMemo(() => {
    const statusFiltered =
      paymentFilter === "all"
        ? allPayments
        : allPayments.filter((p) => p.paymentStatus.toLowerCase() === paymentFilter.toLowerCase());

    const methodFiltered =
      paymentMethodFilter === "all"
        ? statusFiltered
        : statusFiltered.filter((p) => (p.paymentMethod ?? "paynow").toLowerCase().includes(paymentMethodFilter.toLowerCase()));

    const query = paymentSearch.trim().toLowerCase();
    if (!query) return methodFiltered;

    return methodFiltered.filter((p) => {
      const created = p.createdAt ? new Date(p.createdAt).toLocaleString().toLowerCase() : "";
      const paidAt = p.paidAt ? new Date(p.paidAt).toLocaleString().toLowerCase() : "";
      return [
        p.orderNumber,
        p.reference,
        p.customerEmail ?? "",
        p.paymentMethod ?? "",
        p.paymentStatus ?? "",
        p.orderStatus ?? "",
        p.providerStatus ?? "",
        created,
        paidAt,
      ].some((field) => field.toLowerCase().includes(query));
    });
  }, [allPayments, paymentFilter, paymentMethodFilter, paymentSearch]);

  const sortedPayments = useMemo(() => {
    const list = [...filteredPayments];
    const dateValue = (value: string | null) => (value ? new Date(value).getTime() : 0);
    list.sort((a, b) => {
      let delta = 0;
      if (sortBy === "amount") delta = a.amount - b.amount;
      if (sortBy === "paymentStatus") delta = a.paymentStatus.localeCompare(b.paymentStatus);
      if (sortBy === "createdAt") delta = dateValue(a.createdAt) - dateValue(b.createdAt);
      if (sortBy === "paidAt") delta = dateValue(a.paidAt) - dateValue(b.paidAt);
      return sortDirection === "asc" ? delta : -delta;
    });
    return list;
  }, [filteredPayments, sortBy, sortDirection]);

  const summary = useMemo(() => {
    const paid = allPayments.filter((payment) => payment.paymentStatus.toLowerCase() === "paid");
    const pending = allPayments.filter((payment) => {
      const status = payment.paymentStatus.toLowerCase();
      return status.includes("pending") || status === "sent" || status === "initiated";
    });
    const failed = allPayments.filter((payment) => {
      const status = payment.paymentStatus.toLowerCase();
      return !(status === "paid" || status.includes("pending") || status === "sent" || status === "initiated");
    });

    return {
      total: allPayments.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      paidValue: paid.reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [allPayments]);

  const paymentsPageSize = density === "compact" ? 14 : 8;
  const totalPaymentsPages = Math.max(1, Math.ceil(filteredPayments.length / paymentsPageSize));
  const paymentsPageRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, paymentsPage), totalPaymentsPages);
    const start = (safePage - 1) * paymentsPageSize;
    return sortedPayments.slice(start, start + paymentsPageSize);
  }, [sortedPayments, paymentsPage, totalPaymentsPages, paymentsPageSize]);

  const rowPadding = density === "compact" ? "py-2" : "py-4";
  const cardPadding = density === "compact" ? "p-4" : "p-5";

  const toggleSort = (key: PaymentSortKey) => {
    if (sortBy === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDirection("desc");
  };

  const exportCsv = () => {
    if (!sortedPayments.length) return;
    const escape = (value: string | number | null | undefined) => {
      const raw = String(value ?? "");
      if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    };
    const header = ["payer", "order_number", "reference", "method", "amount", "payment_status", "provider_status", "created_at", "paid_at"];
    const rows = sortedPayments.map((p) => [
      p.customerEmail ?? "Guest checkout",
      p.orderNumber,
      p.reference,
      p.paymentMethod ?? "Paynow",
      p.amount.toFixed(2),
      p.paymentStatus,
      p.providerStatus ?? "",
      p.createdAt,
      p.paidAt ?? "",
    ]);
    const csv = [header, ...rows].map((line) => line.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canReadPayments) {
    return <AdminAccessNotice title="Payments restricted" description="Your role does not include payment visibility." />;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/10 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.8),rgba(248,250,252,0.96))] px-6 py-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    <Wallet className="h-3.5 w-3.5" />
                    Payments desk
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">Payments</h2>
                  <p className="mt-1 text-sm text-foreground/60">Track paid, pending, and failed payments without the list collapsing into noise.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">Matched</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{filteredPayments.length}</p>
                    <p className="text-xs text-foreground/50">visible rows</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">Paid</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700">{summary.paidCount}</p>
                    <p className="text-xs text-foreground/50">{formatCurrency(summary.paidValue)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">Pending</p>
                    <p className="mt-1 text-2xl font-bold text-amber-700">{summary.pendingCount}</p>
                    <p className="text-xs text-foreground/50">awaiting settlement</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">Failed</p>
                    <p className="mt-1 text-2xl font-bold text-rose-700">{summary.failedCount}</p>
                    <p className="text-xs text-foreground/50">need follow-up</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 rounded-2xl border border-border/70 bg-card/80 p-3 md:grid-cols-2 xl:grid-cols-[auto_auto_minmax(260px,1fr)_auto_auto] xl:items-center">
                <div className="flex flex-wrap gap-1 rounded-xl bg-muted/50 p-1">
                  {["all", "paid", "pending", "failed"].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setPaymentFilter(status);
                        setPaymentsPage(1);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        paymentFilter === status
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground/60 hover:bg-background hover:text-foreground"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                <NativeSelect
                  value={paymentMethodFilter}
                  onChange={(event) => {
                    setPaymentMethodFilter(event.target.value);
                    setPaymentsPage(1);
                  }}
                >
                  <option value="all">All methods</option>
                  <option value="paynow">Paynow</option>
                  <option value="ecocash">EcoCash</option>
                  <option value="onemoney">OneMoney</option>
                  <option value="visa">VISA</option>
                </NativeSelect>

                <input
                  value={paymentSearch}
                  onChange={(e) => {
                    setPaymentSearch(e.target.value);
                    setPaymentsPage(1);
                  }}
                  placeholder="Search payer, order, reference, provider..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="rounded-xl px-3" aria-label="Payment list settings" title="Payment list settings">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={density} onValueChange={(value) => setDensity(value as "comfortable" | "compact")}>
                      <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="secondary"
                  onClick={exportCsv}
                  disabled={!sortedPayments.length}
                  className="rounded-xl px-3"
                  aria-label="Download payments CSV"
                  title="Download payments CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {paymentsLoading ? (
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
              <div className="hidden xl:block">
                <div>
                  <Table className="table-fixed w-full">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow className="border-b border-border/80">
                        <TableHead className="w-[34%] bg-card">Payment</TableHead>
                        <TableHead className="w-[12%] bg-card">Method</TableHead>
                        <TableHead className="w-[12%] bg-card text-right">
                          <button className="inline-flex items-center gap-1" onClick={() => toggleSort("amount")}>
                            Amount
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </TableHead>
                        <TableHead className="w-[18%] bg-card">
                          <button className="inline-flex items-center gap-1" onClick={() => toggleSort("paymentStatus")}>
                            Status
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </TableHead>
                        <TableHead className="w-[12%] bg-card">
                          <button className="inline-flex items-center gap-1" onClick={() => toggleSort("createdAt")}>
                            Created
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </TableHead>
                        <TableHead className="w-[12%] bg-card">
                          <button className="inline-flex items-center gap-1" onClick={() => toggleSort("paidAt")}>
                            Paid at
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsPageRows.map((payment) => (
                        <TableRow key={payment.id} className="border-b border-border/60 hover:bg-muted/20">
                          <TableCell className={`${rowPadding} align-top`}>
                            <div className="min-w-0 space-y-2">
                              <div className="min-w-0 space-y-1">
                                <p className="break-words font-semibold text-foreground">{payment.customerEmail ?? "Guest checkout"}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/55">
                                  <span className="rounded-full bg-muted px-2 py-1">Order {payment.orderNumber}</span>
                                  <span className="break-words">Order status: {payment.orderStatus.replace(/_/g, " ")}</span>
                                </div>
                              </div>
                              <p className="break-all font-mono text-[11px] text-foreground/45">{payment.reference}</p>
                            </div>
                          </TableCell>
                          <TableCell className={`${rowPadding} align-top`}>
                            <span className="inline-flex rounded-full border border-border bg-muted/35 px-2.5 py-1 text-xs font-medium text-foreground/75">
                              {paymentMethodLabel(payment.paymentMethod)}
                            </span>
                          </TableCell>
                          <TableCell className={`${rowPadding} align-top text-right`}>
                            <p className="text-base font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
                          </TableCell>
                            <TableCell className={`${rowPadding} align-top`}>
                              <Badge className={statusBadgeClasses(payment.paymentStatus)}>{payment.paymentStatus.replace(/_/g, " ")}</Badge>
                            </TableCell>
                          <TableCell className={`${rowPadding} align-top text-sm text-foreground/65`}>
                            <div className="space-y-0.5">
                              <p>{formatDateParts(payment.createdAt).date}</p>
                              <p className="text-xs text-foreground/45">{formatDateParts(payment.createdAt).time}</p>
                            </div>
                          </TableCell>
                          <TableCell className={`${rowPadding} align-top text-sm text-foreground/65`}>
                            <div className="space-y-0.5">
                              <p>{formatDateParts(payment.paidAt).date}</p>
                              {formatDateParts(payment.paidAt).time ? (
                                <p className="text-xs text-foreground/45">{formatDateParts(payment.paidAt).time}</p>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!filteredPayments.length && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-12 text-center text-sm text-foreground/55">
                            No payments match your filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-3 p-4 xl:hidden">
                {paymentsPageRows.map((payment) => (
                  <div key={payment.id} className={`rounded-2xl border border-border bg-card shadow-sm ${cardPadding}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="break-words font-semibold text-foreground">{payment.customerEmail ?? "Guest checkout"}</p>
                        <p className="text-sm text-foreground/60">Order {payment.orderNumber}</p>
                      </div>
                      <Badge className={statusBadgeClasses(payment.paymentStatus)}>{payment.paymentStatus.replace(/_/g, " ")}</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">Amount</p>
                        <p className="mt-1 font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">Method</p>
                        <p className="mt-1 text-sm text-foreground/75">{paymentMethodLabel(payment.paymentMethod)}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">Reference</p>
                        <p className="mt-1 break-all font-mono text-xs text-foreground/60">{payment.reference}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">Order status</p>
                        <p className="mt-1 text-sm text-foreground/75">{payment.orderStatus.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">Created</p>
                        <p className="mt-1 text-sm text-foreground/75">{formatDateParts(payment.createdAt).date}</p>
                        <p className="text-xs text-foreground/45">{formatDateParts(payment.createdAt).time}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">Paid at</p>
                        <p className="mt-1 text-sm text-foreground/75">{formatDateParts(payment.paidAt).date}</p>
                        {formatDateParts(payment.paidAt).time ? (
                          <p className="text-xs text-foreground/45">{formatDateParts(payment.paidAt).time}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}

                {!filteredPayments.length && (
                  <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-foreground/55">
                    No payments match your filters.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-border bg-muted/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-foreground/55">
                  {(() => {
                    const start = (paymentsPage - 1) * paymentsPageSize;
                    const end = start + paymentsPageRows.length;
                    const remaining = Math.max(0, filteredPayments.length - end);
                    return `Showing ${Math.min(start + 1, filteredPayments.length)}-${end} of ${filteredPayments.length} • ${remaining} left`;
                  })()}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" disabled={paymentsPage <= 1} onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-accent">
                    Page {Math.min(paymentsPage, totalPaymentsPages)} / {totalPaymentsPages}
                  </Badge>
                  <Button
                    variant="secondary"
                    disabled={paymentsPage >= totalPaymentsPages}
                    onClick={() => setPaymentsPage((p) => Math.min(totalPaymentsPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




