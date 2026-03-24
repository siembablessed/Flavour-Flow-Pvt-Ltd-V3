import { useState } from "react";
import { X, Smartphone, CreditCard, Check } from "lucide-react";
import { toast } from "sonner";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onSuccess: () => void;
}

const paymentMethods = [
  { id: "ecocash", label: "EcoCash", icon: Smartphone, color: "bg-green-600" },
  { id: "onemoney", label: "OneMoney", icon: Smartphone, color: "bg-red-600" },
  { id: "visa", label: "VISA", icon: CreditCard, color: "bg-blue-700" },
] as const;

const PaymentModal = ({ open, onClose, total, onSuccess }: PaymentModalProps) => {
  const [selected, setSelected] = useState<string>("ecocash");
  const [phone, setPhone] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePay = () => {
    if (selected !== "visa" && !phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      toast.success("Payment successful!");
      setTimeout(() => {
        setSuccess(false);
        setPhone("");
        onSuccess();
      }, 2000);
    }, 2000);
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

        {success ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-bold mb-1">Payment Successful</h3>
            <p className="text-foreground/50 text-sm">Your order has been placed.</p>
          </div>
        ) : (
          <>
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
                <input type="tel" placeholder="e.g. 0771234567" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
            ) : (
              <div className="mb-5 space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground/50 mb-1.5 block">Card Number</label>
                  <input type="text" placeholder="4242 4242 4242 4242" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground/50 mb-1.5 block">Expiry</label>
                    <input type="text" placeholder="MM/YY" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground/50 mb-1.5 block">CVV</label>
                    <input type="text" placeholder="123" className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={processing}
              className="w-full py-3.5 rounded-lg brand-gradient text-white font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.97] disabled:opacity-50 shadow-md shadow-primary/15"
            >
              {processing ? "Processing..." : `Pay $${total.toFixed(2)}`}
            </button>
            <p className="text-[10px] text-foreground/30 text-center mt-3">Demo payment — no real charges.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
