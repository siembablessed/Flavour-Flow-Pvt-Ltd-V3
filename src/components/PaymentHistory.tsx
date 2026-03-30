import { useEffect, useState } from "react";
import { X, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface OrderPayment {
  reference: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  order_payments: OrderPayment[];
}

interface PaymentHistoryProps {
  open: boolean;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </span>
    );
  }
  if (s === "pending_payment" || s === "sent" || s === "initiated") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" /> {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PaymentHistory({ open, onClose }: PaymentHistoryProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase
      .from("orders")
      .select("id, order_number, total, status, created_at, paid_at, order_payments(reference, amount, status, payment_method, created_at, paid_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (err) {
      setError("Could not load payment history.");
    } else {
      setOrders((data as Order[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && user) {
      void fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 sm:fade-in sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold">Payment History</h2>
            <p className="text-xs text-foreground/50 mt-0.5">All your payment attempts</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchHistory()}
              className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-95"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors active:scale-95">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && orders.length === 0 && (
            <div className="flex items-center justify-center py-16 text-foreground/40 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="text-center py-16 text-foreground/40">
              <p className="text-sm">No payments yet.</p>
              <p className="text-xs mt-1">Your payment history will appear here.</p>
            </div>
          )}

          {orders.map((order) => {
            const payment = order.order_payments?.[0];
            return (
              <div key={order.id} className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate font-mono">{order.order_number}</p>
                    <p className="text-xs text-foreground/40 mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-sm font-bold tabular-nums">${Number(order.total).toFixed(2)}</span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>

                {payment && (
                  <div className="border-t border-border pt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-xs text-foreground/50">
                      Method: <span className="font-medium text-foreground/70">{payment.payment_method ?? "Paynow"}</span>
                    </span>
                    <span className="text-xs text-foreground/50">
                      Ref: <span className="font-mono text-[11px] text-foreground/70">{payment.reference}</span>
                    </span>
                    {order.paid_at && (
                      <span className="text-xs text-foreground/50">
                        Paid: <span className="font-medium text-foreground/70">{formatDate(order.paid_at)}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
