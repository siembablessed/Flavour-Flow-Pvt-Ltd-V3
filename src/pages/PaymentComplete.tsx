import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, CircleX, LoaderCircle } from "lucide-react";
import { getPaynowStatus } from "@/lib/payments";

const PaymentComplete = () => {
  const [searchParams] = useSearchParams();
  const reference = useMemo(() => searchParams.get("reference")?.trim() ?? "", [searchParams]);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [status, setStatus] = useState<string>("Pending");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [mobileInstructions, setMobileInstructions] = useState<string>("");

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      setError("Missing payment reference");
      return;
    }

    try {
      const key = `paynow_instructions_${reference}`;
      const stored = sessionStorage.getItem(key);
      if (stored) {
        setMobileInstructions(stored);
        sessionStorage.removeItem(key);
      }
    } catch {
      // ignore
    }

    let active = true;

    const check = async (attempt = 0) => {
      try {
        const result = await getPaynowStatus(reference);
        if (!active) return;

        setStatus(result.status || "Pending");
        setPaid(result.paid);
        setOrderNumber(result.orderNumber ?? "");

        if (!result.paid && attempt < 5) {
          setTimeout(() => {
            void check(attempt + 1);
          }, 5000);
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Could not verify payment status";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void check();
    return () => {
      active = false;
    };
  }, [reference]);

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Payment Status</h1>

        {mobileInstructions ? (
          <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4 text-sm text-foreground/80">
            <p className="font-semibold text-foreground mb-2">Mobile money instructions</p>
            <p className="whitespace-pre-wrap">{mobileInstructions}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 flex items-center gap-3 text-foreground/70">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            <p>Checking your Paynow payment...</p>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 text-destructive">
              <CircleX className="h-5 w-5" />
              <p className="font-semibold">Payment verification failed</p>
            </div>
            <p className="mt-2 text-sm text-foreground/70">{error}</p>
          </div>
        ) : paid ? (
          <div className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-semibold">Payment successful</p>
            </div>
            <p className="mt-2 text-sm text-foreground/70">Reference: {reference}</p>
            {orderNumber && <p className="mt-1 text-sm text-foreground/70">Order: {orderNumber}</p>}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <CircleX className="h-5 w-5" />
              <p className="font-semibold">Payment not completed</p>
            </div>
            <p className="mt-2 text-sm text-foreground/70">Current status: {status}</p>
          </div>
        )}

        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Back to store
          </Link>
        </div>
      </div>
    </main>
  );
};

export default PaymentComplete;
