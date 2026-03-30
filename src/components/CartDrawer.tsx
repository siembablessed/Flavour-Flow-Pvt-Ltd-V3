import { X, Minus, Plus, Trash2, LogIn } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import PaymentModal from "./PaymentModal";
import { AuthDialog } from "./AuthDialog";
import { useAuth } from "@/context/AuthContext";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const CartDrawer = ({ open, onClose }: CartDrawerProps) => {
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const handleCheckout = () => {
    if (!user) {
      setAuthOpen(true);
    } else {
      setPaymentOpen(true);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="text-lg font-bold">Your Order</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors active:scale-95">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {items.length === 0 && (
              <div className="text-center text-foreground/40 py-16">
                <p className="text-base mb-1">Cart is empty</p>
                <p className="text-sm">Add products from the catalogue.</p>
              </div>
            )}
            {items.map((item) => (
              <div key={item.product.id} className="flex gap-3 bg-muted/50 rounded-xl p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-foreground/40">{item.product.pack}</p>
                  <p className="text-sm font-bold mt-1 tabular-nums">${(item.product.casePrice * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="p-1.5 rounded-md bg-card border border-border hover:bg-muted transition-colors active:scale-95"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-semibold w-7 text-center tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="p-1.5 rounded-md bg-card border border-border hover:bg-muted transition-colors active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors active:scale-95 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <div className="p-5 border-t border-border space-y-3">
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">${totalPrice.toFixed(2)}</span>
              </div>

              {!user && (
                <p className="text-xs text-foreground/50 flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  Sign in or create an account to proceed to payment.
                </p>
              )}

              <button
                onClick={handleCheckout}
                className="w-full py-3.5 rounded-lg brand-gradient text-white font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.97] shadow-md shadow-primary/15 flex items-center justify-center gap-2"
              >
                {!user && <LogIn className="w-4 h-4" />}
                {user ? "Proceed to Payment" : "Sign In to Pay"}
              </button>

              <button
                onClick={clearCart}
                className="w-full py-2.5 rounded-lg border border-border text-sm text-foreground/40 hover:bg-muted transition-colors active:scale-[0.97]"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        total={totalPrice}
        items={items.map((item) => ({ id: item.product.id, quantity: item.quantity }))}
      />
    </>
  );
};

export default CartDrawer;
