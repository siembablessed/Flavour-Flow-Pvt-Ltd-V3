import { useState } from "react";
import { X, Smartphone, CreditCard, Check } from "lucide-react";
import { toast } from "sonner";
import { initiatePaynowPayment, type CheckoutLine } from "@/lib/payments";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  items: CheckoutLine[];
}

const paymentMethods = [
  { id: "ecocash", label: "EcoCash", icon: Smartphone, color: "bg-green-600" },
  { id: "onemoney", label: "OneMoney", icon: Smartphone, color: "bg-red-600" },
  { id: "visa", label: "VISA", icon: CreditCard, color: "bg-blue-700" },
] as const;

const PaymentModal = ({ open, onClose, total, items }: PaymentModalProps) => {
  const [selected, setSelected] = useState<(typeof paymentMethods)[number]["id"]>("ecocash");
  const [phone, setPhone] = useState("");
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    const cleanPhone = phone.replace(/\s+/g, "").trim();

    if (selected !== "visa" && !cleanPhone) {
      toast.error("Please enter your phone number");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setProcessing(true);

    try {
      const payment = await initiatePaynowPayment({
        method: selected,
        phone: selected !== "visa" ? cleanPhone : undefined,
        items,
      });

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

  const inputClass = "w-full px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md p-6 animate-fade-up shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors active:scale-95">
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="text-lg font-bold mb-1">Payment</h3>
          <p className="text-foreground/50 text-sm mb-5">Total: <span className="font-bold text-foreground tabular-nums">${total.toFixed(2)}</span></p>

          <div className="space-y-2 mb-5">
            {paymentMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                  selected === m.id ? "border-primary bg-primary/5" : "border-border hover:border-foreground/15"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg ${m.color} flex items-center justify-center`}>
                  <m.icon className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-sm">{m.label}</span>
                {selected === m.id && (
                  <div className="ml-auto w-5 h-5 rounded-full brand-gradient flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {selected !== "visa" ? (
            <div className="mb-5">
              <label className="text-xs font-medium text-foreground/50 mb-1.5 block">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. 0771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
          ) : (
            <div className="mb-5 rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground/60">
              Card checkout is processed by Paynow on redirect.
            </div>
          )}

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
