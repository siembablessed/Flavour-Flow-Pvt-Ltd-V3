import { useMemo, useState } from "react";
import { ArrowUpDown, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminOutlet } from "./useAdminOutlet";
import { formatCurrency, formatDate, statusBadgeClasses } from "./adminFormat";

type PaymentSortKey = "createdAt" | "paidAt" | "amount" | "orderNumber" | "paymentStatus";

export default function AdminPaymentsPage() {
  const { adminData, paymentsLoading, paymentsError } = useAdminOutlet();
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sortBy, setSortBy] = useState<PaymentSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filteredPayments = useMemo(() => {
    if (!adminData?.payments) return [];

    const statusFiltered =
      paymentFilter === "all"
        ? adminData.payments
        : adminData.payments.filter((p) => p.paymentStatus.toLowerCase() === paymentFilter.toLowerCase());

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
  }, [adminData?.payments, paymentFilter, paymentMethodFilter, paymentSearch]);

  const sortedPayments = useMemo(() => {
    const list = [...filteredPayments];
    const dateValue = (value: string | null) => (value ? new Date(value).getTime() : 0);
    list.sort((a, b) => {
      let delta = 0;
      if (sortBy === "amount") delta = a.amount - b.amount;
      if (sortBy === "orderNumber") delta = a.orderNumber.localeCompare(b.orderNumber);
      if (sortBy === "paymentStatus") delta = a.paymentStatus.localeCompare(b.paymentStatus);
      if (sortBy === "createdAt") delta = dateValue(a.createdAt) - dateValue(b.createdAt);
      if (sortBy === "paidAt") delta = dateValue(a.paidAt) - dateValue(b.paidAt);
      return sortDirection === "asc" ? delta : -delta;
    });
    return list;
  }, [filteredPayments, sortBy, sortDirection]);

  const paymentsPageSize = density === "compact" ? 16 : 8;
  const totalPaymentsPages = Math.max(1, Math.ceil(filteredPayments.length / paymentsPageSize));
  const paymentsPageRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, paymentsPage), totalPaymentsPages);
    const start = (safePage - 1) * paymentsPageSize;
    return sortedPayments.slice(start, start + paymentsPageSize);
  }, [sortedPayments, paymentsPage, totalPaymentsPages, paymentsPageSize]);

  const rowPadding = density === "compact" ? "py-2" : "py-4";

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
        return `"${raw.replace(/"/g, "\"\"")}"`;
      }
      return raw;
    };
    const header = [
      "payer",
      "order_number",
      "reference",
      "method",
      "amount",
      "payment_status",
      "provider_status",
      "created_at",
      "paid_at",
    ];
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

  return (
    <Card className="overflow-hidden border-primary/10 shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Payments</h2>
            <p className="text-sm text-foreground/55">Track paid, pending, and failed payments.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:max-w-2xl lg:justify-end">
            <div className="flex gap-1 rounded-lg bg-background p-1">
              {["all", "paid", "pending", "failed"].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setPaymentFilter(status);
                    setPaymentsPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    paymentFilter === status
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/60 hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setPaymentsPage(1);
              }}
              className="rounded-full border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All methods</option>
              <option value="paynow">Paynow</option>
              <option value="ecocash">EcoCash</option>
              <option value="onemoney">OneMoney</option>
              <option value="visa">VISA</option>
            </select>
            <input
              value={paymentSearch}
              onChange={(e) => {
                setPaymentSearch(e.target.value);
                setPaymentsPage(1);
              }}
              placeholder="Search order, payer, reference..."
              className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={density}
              onChange={(e) => setDensity(e.target.value as "comfortable" | "compact")}
              className="rounded-full border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
            <Button variant="secondary" onClick={exportCsv} disabled={!sortedPayments.length}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
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
            <div className="max-h-[66vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Payer</TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("orderNumber")}>
                      Order
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("amount")}>
                      Amount
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("paymentStatus")}>
                      Status
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("paidAt")}>
                      Paid at
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsPageRows.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className={rowPadding}>
                      <p className="font-semibold text-foreground">{payment.customerEmail ?? "Guest checkout"}</p>
                      <p className="text-xs text-foreground/50">{formatDate(payment.createdAt)}</p>
                    </TableCell>
                    <TableCell className={rowPadding}>{payment.orderNumber}</TableCell>
                    <TableCell className={`font-mono text-xs text-foreground/65 ${rowPadding}`}>{payment.reference}</TableCell>
                    <TableCell className={rowPadding}>{payment.paymentMethod ?? "Paynow"}</TableCell>
                    <TableCell className={`font-semibold text-foreground ${rowPadding}`}>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className={rowPadding}>
                      <div className="flex flex-col gap-2">
                        <Badge className={statusBadgeClasses(payment.paymentStatus)}>{payment.paymentStatus.replace(/_/g, " ")}</Badge>
                        {payment.providerStatus ? (
                          <span className="text-xs text-foreground/45">Provider: {payment.providerStatus}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className={rowPadding}>{formatDate(payment.paidAt)}</TableCell>
                  </TableRow>
                ))}
                {!filteredPayments.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-foreground/55">
                      No payments match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
  );
}

