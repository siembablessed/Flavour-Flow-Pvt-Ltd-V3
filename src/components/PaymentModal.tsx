import { useState, useEffect } from "react";
import { X, CreditCard, Smartphone, ShieldCheck, Lock, WifiOff, KeyRound, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { initiatePaynowPayment, omariSubmitOtp, type CheckoutLine } from "@/lib/payments";
import { useAuth } from "@/context/AuthContext";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  items: CheckoutLine[];
}

// ---------------------------------------------------------------------------
// Free client-side card validation (Luhn + brand detection)
// ---------------------------------------------------------------------------
function luhnCheck(num: string): boolean {
  const digits = num.replace(/\s/g, "");
  if (!/^\d+$/.test(digits) || digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectCardBrand(num: string): "visa" | "mastercard" | "unknown" {
  const d = num.replace(/\s/g, "");
  if (/^4/.test(d)) return "visa";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "mastercard";
  return "unknown";
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function isExpiryValid(expiry: string): boolean {
  const [mm, yy] = expiry.split("/");
  if (!mm || !yy || mm.length < 2 || yy.length < 2) return false;
  const month = parseInt(mm, 10);
  const year = parseInt(`20${yy}`, 10);
  if (month < 1 || month > 12) return false;
  return new Date(year, month) > new Date();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Method = "ecocash" | "onemoney" | "zimswitch" | "innbucks" | "omari" | "vmc";

interface MethodConfig {
  id: Method;
  label: string;
  sub: string;
  available: boolean;
  inputType: "phone" | "token" | "card" | "none";
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
}

const METHODS: MethodConfig[] = [
  {
    id: "ecocash",
    label: "EcoCash",
    sub: "Express mobile payment",
    available: true,
    inputType: "phone",
    badge: "EC",
    badgeColor: "text-green-500 bg-green-500/10",
    icon: <Smartphone className="h-4 w-4" />,
  },
  {
    id: "innbucks",
    label: "InnBucks",
    sub: "InnBucks mobile wallet",
    available: true,
    inputType: "phone",
    badge: "IB",
    badgeColor: "text-purple-500 bg-purple-500/10",
    icon: <Smartphone className="h-4 w-4" />,
  },
  {
    id: "zimswitch",
    label: "Zimswitch",
    sub: "National debit / card",
    available: true,
    inputType: "token",
    badge: "ZS",
    badgeColor: "text-blue-500 bg-blue-500/10",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    id: "omari",
    label: "Omari",
    sub: "Omari mobile wallet",
    available: true,
    inputType: "phone",
    badge: "OM",
    badgeColor: "text-orange-500 bg-orange-500/10",
    icon: <Smartphone className="h-4 w-4" />,
  },
  {
    id: "vmc",
    label: "Visa / Mastercard",
    sub: "Card payments — coming soon",
    available: false,
    inputType: "card",
    badge: "VM",
    badgeColor: "text-foreground/30 bg-muted",
    icon: <CreditCard className="h-4 w-4" />,
  },
];

const PaymentModal = ({ open, onClose, total, items }: PaymentModalProps) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const email = user?.email ?? "";
  const [method, setMethod] = useState<Method>("ecocash");

  // Mobile money phone
  const [phone, setPhone] = useState("");
  // Token-based (Zimswitch)
  const [token, setToken] = useState("");

  // Card fields (VMC — future use)
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  // O'mari 2-step OTP state
  const [omariStep, setOmariStep] = useState<"idle" | "otp">("idle");
  const [omariReference, setOmariReference] = useState("");
  const [omariOtp, setOmariOtp] = useState("");
  const [omariSubmitting, setOmariSubmitting] = useState(false);

  // Shared reference for status-check redirect (O'mari + InnBucks)
  const [pendingReference, setPendingReference] = useState("");

  // InnBucks auth code state
  const [innbucksInfo, setInnbucksInfo] = useState<{
    code: string; deepLink: string; qr: string; expiresAt: string;
  } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Reset all input state on close
  useEffect(() => {
    if (!open) {
      setMethod("ecocash");
      setPhone("");
      setToken("");
      setCardNumber("");
      setCardName("");
      setExpiry("");
      setCvv("");
      setCardErrors({});
      setOmariStep("idle");
      setOmariReference("");
      setOmariOtp("");
      setPendingReference("");
      setInnbucksInfo(null);
      setCodeCopied(false);
    }
  }, [open]);

  const handleMethodChange = (m: Method) => {
    const cfg = METHODS.find((x) => x.id === m);
    if (!cfg?.available) return;
    setMethod(m);
    setPhone("");
    setToken("");
    setCardErrors({});
    setOmariStep("idle");
    setOmariReference("");
    setOmariOtp("");
    setPendingReference("");
    setInnbucksInfo(null);
    setCodeCopied(false);
  };

  const cardBrand = detectCardBrand(cardNumber);
  const rawCard = cardNumber.replace(/\s/g, "");

  const validateCard = (): boolean => {
    const errs: Record<string, string> = {};
    if (!cardName.trim()) errs.cardName = "Cardholder name required";
    if (rawCard.length < 13 || !luhnCheck(rawCard)) errs.cardNumber = "Invalid card number";
    if (!isExpiryValid(expiry)) errs.expiry = "Invalid or expired date";
    if (cvv.length < 3) errs.cvv = "CVV must be 3–4 digits";
    setCardErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const activeConfig = METHODS.find((m) => m.id === method)!;

  const handlePay = async () => {
    if (items.length === 0) { toast.error("Your cart is empty"); return; }
    if (!email) { toast.error("Email is required"); return; }

    if (activeConfig.inputType === "phone" && !phone) {
      toast.error("Phone number is required"); return;
    }
    if (activeConfig.inputType === "token" && !token) {
      toast.error("Card / token number is required"); return;
    }
    if (activeConfig.inputType === "card") {
      if (!validateCard()) { toast.error("Please fix the card details"); return; }
    }

    setProcessing(true);
    try {
      const payload: Parameters<typeof initiatePaynowPayment>[0] = {
        items,
        email,
        ...(user?.id && { userId: user.id }),
        method,
        ...(activeConfig.inputType === "phone" && { phone }),
        ...(activeConfig.inputType === "token" && { token }),
      };

      const payment = await initiatePaynowPayment(payload);

      // ── Web redirect (Paynow / VMC) ─────────────────────────────────────
      if (payment.mode === "redirect") {
        if (!payment.redirectUrl) throw new Error("Paynow did not return a redirect URL");
        toast.success("Redirecting to Paynow…");
        window.location.assign(payment.redirectUrl);
        return;
      }

      // ── O'mari — 2-step OTP ─────────────────────────────────────────────
      if (method === "omari") {
        if (payment.omariRemoteOtpUrl) {
          setOmariReference(payment.reference);
          setPendingReference(payment.reference);
          setOmariStep("otp");
          toast.success("OTP sent to your phone. Please enter it below.");
        } else {
          toast.success("Follow the instructions on your phone.");
          window.location.assign(`/payment/complete?reference=${encodeURIComponent(payment.reference)}`);
        }
        setProcessing(false);
        return;
      }

      // ── InnBucks — show auth code ────────────────────────────────────────
      if (method === "innbucks" && payment.innbucksCode) {
        setPendingReference(payment.reference);
        setInnbucksInfo({
          code: payment.innbucksCode,
          deepLink: payment.innbucksDeepLink ?? "",
          qr: payment.innbucksQr ?? "",
          expiresAt: payment.innbucksExpiresAt ?? "",
        });
        setProcessing(false);
        return;
      }

      // ── Standard mobile (EcoCash, OneMoney, Zimswitch, InnBucks fallback) ─
      if (payment.mode === "mobile") {
        try {
          sessionStorage.setItem(
            `paynow_instructions_${payment.reference}`,
            payment.instructions ?? "",
          );
        } catch { /* ignore quota / private mode */ }
        toast.success("Follow the instructions on your phone to complete payment.");
        window.location.assign(`/payment/complete?reference=${encodeURIComponent(payment.reference)}`);
        return;
      }

      throw new Error("Unexpected payment response from server");
    } catch (error) {
      console.error("[Payment Modal Error]:", (error as Error).message || error);
      toast.error(error instanceof Error ? error.message : "Unable to initiate payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleOmariOtp = async () => {
    if (!omariOtp.trim()) { toast.error("Please enter the OTP"); return; }
    setOmariSubmitting(true);
    try {
      const result = await omariSubmitOtp({ reference: omariReference, otp: omariOtp.trim() });
      if (result.paid) {
        toast.success("Payment confirmed! ✓");
        window.location.assign(`/payment/complete?reference=${encodeURIComponent(omariReference)}`);
      } else if (result.status?.toLowerCase() === "error") {
        toast.error("OTP incorrect or expired. Please try again.");
      } else {
        toast.success("OTP accepted — awaiting payment confirmation.");
        window.location.assign(`/payment/complete?reference=${encodeURIComponent(omariReference)}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP submission failed");
    } finally {
      setOmariSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet — grows from bottom on mobile, centred dialog on desktop */}
      <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[85dvh]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-base font-bold">Complete Payment</h3>
            <p className="text-sm text-foreground/50 mt-0.5">
              Total: <span className="font-bold text-foreground tabular-nums">${total.toFixed(2)}</span>
            </p>
            {email && (
              <p className="text-[11px] text-foreground/40 mt-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                {email}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors active:scale-95 -mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* ── Phone / Token input — shown ABOVE method tiles ── */}
          {(method === "ecocash" || method === "omari" || method === "innbucks") && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-foreground/50 mb-1.5">
                {method === "ecocash" ? "EcoCash" : method === "innbucks" ? "InnBucks" : "Omari"} Mobile Number
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black rounded px-1 py-0.5
                  ${method === "ecocash" ? "text-green-500 bg-green-500/10"
                    : method === "innbucks" ? "text-purple-500 bg-purple-500/10"
                    : "text-orange-500 bg-orange-500/10"}`}>
                  {method === "ecocash" ? "EC" : method === "innbucks" ? "IB" : "OM"}
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder={method === "ecocash" ? "0771234567" : method === "innbucks" ? "0781234567" : "0731234567"}
                  className="w-full text-sm pl-12 pr-3.5 py-2.5 rounded-lg border border-border bg-background outline-none focus:border-primary transition-colors"
                />
              </div>
              <p className="text-[11px] text-foreground/40 mt-1.5">
                You will receive a USSD prompt on your phone to approve payment.
              </p>
            </div>
          )}

          {method === "zimswitch" && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-foreground/50 mb-1.5">
                Zimswitch Card / Token <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-500 bg-blue-500/10 rounded px-1 py-0.5">
                  ZS
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\s/g, "").slice(0, 64))}
                  placeholder="Enter your 32-character Zimswitch token"
                  className="w-full text-sm pl-12 pr-3.5 py-2.5 rounded-lg border border-border bg-background outline-none focus:border-primary transition-colors font-mono"
                />
              </div>
              <p className="text-[11px] text-foreground/40 mt-1.5">
                Enter your 32-character Zimswitch token to pay via your debit/credit card.
              </p>
            </div>
          )}

          {/* Payment Method tiles */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-foreground/50 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {METHODS.map((m) => {
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMethodChange(m.id)}
                    disabled={!m.available}
                    className={`
                      relative flex flex-col items-start gap-1.5 px-3 py-2.5 rounded-xl border text-left
                      transition-all duration-150 select-none
                      ${!m.available
                        ? "border-dashed border-border/50 opacity-50 cursor-not-allowed"
                        : active
                          ? "border-primary bg-primary/8 shadow-sm shadow-primary/10"
                          : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                      }
                    `}
                  >
                    {/* Badge + active dot */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] font-black rounded px-1 py-0.5 ${m.badgeColor}`}>
                        {m.badge}
                      </span>
                      {active && m.available && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                      {!m.available && (
                        <WifiOff className="h-3 w-3 text-foreground/30" />
                      )}
                    </div>
                    <span>
                      <span className={`block text-[13px] font-semibold leading-tight ${active ? "text-primary" : ""}`}>
                        {m.label}
                      </span>
                      <span className="block text-[10px] text-foreground/40 leading-tight mt-0.5">
                        {m.sub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* VMC unavailable notice */}
            {method !== "vmc" && (
              <p className="text-[10px] text-foreground/35 mt-1.5 text-center">
                Visa / Mastercard payments are currently unavailable — more options coming soon.
              </p>
            )}
          </div>

          {/* ── Visa / Mastercard — COMING SOON banner (below tiles) ── */}
          {method === "vmc" && (
            <div className="animate-in fade-in duration-150 rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center">
              <Lock className="h-8 w-8 text-foreground/20 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground/50">Visa / Mastercard Unavailable</p>
              <p className="text-[11px] text-foreground/35 mt-1">
                Card payments are currently down. Please use a mobile money option above.
              </p>
            </div>
          )}

          {/* ── O'mari OTP step ── */}
          {omariStep === "otp" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">Enter your O'mari OTP</p>
              </div>
              <p className="text-[11px] text-foreground/50">
                An OTP has been sent to your registered O'mari mobile number. Enter it below to confirm payment.
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={omariOtp}
                onChange={(e) => setOmariOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="e.g. 123456"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-orange-400/50 bg-background outline-none focus:border-orange-500 transition-colors font-mono tracking-widest text-center"
              />
              <p className="text-[10px] text-foreground/35">
                Note: 5 failed attempts will cancel the transaction.
              </p>
            </div>
          )}

          {/* ── InnBucks auth code panel ── */}
          {innbucksInfo && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-purple-500 shrink-0" />
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">InnBucks Authorization Code</p>
              </div>

              {/* Code display + copy button */}
              <div className="flex items-center gap-2 bg-background rounded-lg border border-purple-400/30 px-3 py-3">
                <span className="flex-1 font-mono text-lg font-bold tracking-wider text-foreground break-all select-all">
                  {innbucksInfo.code}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(innbucksInfo.code).then(() => {
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    });
                  }}
                  className="shrink-0 px-2.5 py-1.5 rounded-md border border-purple-400/40 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px] font-semibold hover:bg-purple-500/20 transition-colors"
                >
                  {codeCopied ? "Copied ✓" : "Copy"}
                </button>
              </div>

              {innbucksInfo.expiresAt && (
                <p className="text-[11px] text-foreground/40 text-center">Expires: {innbucksInfo.expiresAt}</p>
              )}
              <p className="text-[11px] text-foreground/50 text-center">
                Open the InnBucks app, tap <strong>Pay</strong>, and enter or scan this code to authorize payment.
              </p>
              {innbucksInfo.deepLink && (
                <a
                  href={innbucksInfo.deepLink}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm font-semibold hover:bg-purple-500/15 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in InnBucks App
                </a>
              )}
            </div>
          )}

        </div>

        {/* ── Footer / Pay button ── */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          {omariStep === "otp" ? (
            // O'mari OTP submit button
            <button
              onClick={() => void handleOmariOtp()}
              disabled={omariSubmitting || omariOtp.length < 4}
              className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm
                transition-[opacity,transform] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              {omariSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Verifying OTP…
                </span>
              ) : "Confirm Payment"}
            </button>
          ) : innbucksInfo ? (
            // InnBucks — waiting for user to approve in-app
            <button
              onClick={() => window.location.assign(`/payment/complete?reference=${encodeURIComponent(pendingReference)}`)}
              className="w-full py-3.5 rounded-xl brand-gradient text-white font-semibold text-sm
                hover:opacity-90 transition-[opacity,transform] active:scale-[0.98] shadow-md shadow-primary/15"
            >
              Check Payment Status
            </button>
          ) : (
            // Normal pay button
            <button
              onClick={() => void handlePay()}
              disabled={processing || !activeConfig.available}
              className="w-full py-3.5 rounded-xl brand-gradient text-white font-semibold text-sm
                hover:opacity-90 transition-[opacity,transform] active:scale-[0.98]
                disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/15"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Processing…
                </span>
              ) : activeConfig.available ? (
                `Pay $${total.toFixed(2)} via ${activeConfig.label}`
              ) : (
                "Method Unavailable"
              )}
            </button>
          )}
          <p className="text-[10px] text-foreground/30 text-center mt-2.5 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Secure payments powered by Paynow
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
