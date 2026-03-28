import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { initiatePaynowPayment, type CheckoutLine } from "@/lib/payments";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  items: CheckoutLine[];
}

const PaymentModal = ({ open, onClose, total, items }: PaymentModalProps) => {
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setProcessing(true);

    try {
      const payment = await initiatePaynowPayment({ items });

      if (!payment.redirectUrl) {
        throw new Error("Paynow did not return a redirect URL");
      }

      toast.success("Redirecting to Paynow...");
      window.location.assign(payment.redirectUrl);
    } catch (error) {
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
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="text-lg font-bold mb-1">Payment</h3>
          <p className="text-foreground/50 text-sm mb-5">
            Total: <span className="font-bold text-foreground tabular-nums">${total.toFixed(2)}</span>
          </p>

          <div className="mb-5 rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground/60">
            You will be redirected to Paynow to choose your preferred payment method.
          </div>

          <button
            onClick={() => void handlePay()}
            disabled={processing}
            className="w-full py-3.5 rounded-lg brand-gradient text-white font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.97] disabled:opacity-50 shadow-md shadow-primary/15"
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
