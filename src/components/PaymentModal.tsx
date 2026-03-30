import { useState, useEffect, useRef } from "react";
import { X, Clock } from "lucide-react";
import { toast } from "sonner";
import { initiatePaynowPayment, type CheckoutLine } from "@/lib/payments";
import { useAuth } from "@/context/AuthContext";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  items: CheckoutLine[];
}

const MOBILE_MONEY_DELAY_MS = 60_000; // 1 minute

const PaymentModal = ({ open, onClose, total, items }: PaymentModalProps) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<"redirect" | "ecocash" | "onemoney" | "visa">("redirect");
  const [phone, setPhone] = useState("");
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-fill email from the logged-in user
  useEffect(() => {
    if (open && user?.email) {
      setEmail(user.email);
    }
  }, [open, user]);

  // Reset and start timers whenever the modal opens/closes
  useEffect(() => {
    if (!open) {
      // Clean up when modal closes
      setShowMobileOptions(false);
      setSecondsLeft(60);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    // Start countdown display
    setSecondsLeft(60);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    // Reveal mobile options after 1 minute
    timerRef.current = setTimeout(() => {
      setShowMobileOptions(true);
    }, MOBILE_MONEY_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [open]);

  // If mobile options get hidden again, reset method if it was mobile
  useEffect(() => {
    if (!showMobileOptions && (method === "ecocash" || method === "onemoney")) {
      setMethod("redirect");
    }
  }, [showMobileOptions, method]);

  const handlePay = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!email) {
      toast.error("Email is required");
      return;
    }

    if ((method === "ecocash" || method === "onemoney") && !phone) {
      toast.error("Phone number is required for mobile money");
      return;
    }

    setProcessing(true);

    try {
      const payload: Parameters<typeof initiatePaynowPayment>[0] = {
        items,
        email,
        ...(user?.id && { userId: user.id }),
        ...(method !== "redirect" && { method }),
        ...((method === "ecocash" || method === "onemoney") && { phone }),
      };

      const payment = await initiatePaynowPayment(payload);

      if (payment.mode === "redirect") {
        if (!payment.redirectUrl) {
          throw new Error("Paynow did not return a redirect URL");
        }
        toast.success("Redirecting to Paynow...");
        window.location.assign(payment.redirectUrl);
        return;
      }

      if (payment.mode === "mobile") {
        if (!payment.instructions) {
          throw new Error("Paynow did not return payment instructions");
        }
        try {
          sessionStorage.setItem(
            `paynow_instructions_${payment.reference}`,
            payment.instructions,
          );
        } catch {
          // ignore quota / private mode
        }
        toast.success("Follow the instructions on your phone to complete payment.");
        const next = `/payment/complete?reference=${encodeURIComponent(payment.reference)}`;
        window.location.assign(next);
        return;
      }

      throw new Error("Unexpected payment response from server");
    } catch (error) {
      console.error("[Payment Modal Error]:", (error as Error).message || error);
      const message = error instanceof Error ? error.message : "Unable to initiate payment";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md p-6 animate-fade-up shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors active:scale-95">
          <X className="h-4 w-4" />
        </button>

        <div>
          <h3 className="text-lg font-bold mb-1">Payment</h3>
          <p className="text-foreground/50 text-sm mb-5">
            Total: <span className="font-bold text-foreground tabular-nums">${total.toFixed(2)}</span>
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground/80">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Customer Email Address"
                className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground/80">Payment Method <span className="text-red-500">*</span></label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background outline-none focus:border-primary/50"
              >
                <option value="redirect">Paynow Web Checkout (Default)</option>
                {showMobileOptions && <option value="ecocash">EcoCash Express</option>}
                {showMobileOptions && <option value="onemoney">OneMoney</option>}
                <option value="visa">Visa/Mastercard</option>
              </select>
            </div>

            {/* Mobile money fallback hint — shown after 1 minute */}
            {showMobileOptions && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 animate-in fade-in slide-in-from-top-2">
                <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  Taking a while? Try <strong>EcoCash Express</strong> or <strong>OneMoney</strong> for instant mobile payment.
                </p>
              </div>
            )}

            {/* Subtle countdown hint before mobile options appear */}
            {!showMobileOptions && secondsLeft < 60 && (
              <p className="text-[11px] text-foreground/30 text-center">
                Mobile money options available in {secondsLeft}s
              </p>
            )}

            {(method === "ecocash" || method === "onemoney") && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-semibold mb-1 text-foreground/80">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0771111111"
                  className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background outline-none focus:border-primary/50"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => void handlePay()}
            disabled={processing}
            className="w-full py-3.5 rounded-lg brand-gradient text-white font-semibold text-sm hover:opacity-90 transition-[opacity,transform] active:scale-[0.98] disabled:opacity-50 shadow-md shadow-primary/15"
          >
            {processing ? "Processing..." : `Pay $${total.toFixed(2)}`}
          </button>
          <p className="text-[10px] text-foreground/30 text-center mt-3">Secure payment by Paynow.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
