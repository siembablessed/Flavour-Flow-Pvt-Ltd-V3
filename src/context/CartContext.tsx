import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { Product, products } from "@/data/products";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

interface CartWireItem {
  productId: string;
  quantity: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function toCartItems(rows: CartWireItem[], productMap: Map<string, Product>): CartItem[] {
  return rows
    .map((row) => {
      const product = productMap.get(String(row.productId));
      if (!product || Number(row.quantity) <= 0) return null;
      return { product, quantity: Number(row.quantity) } as CartItem;
    })
    .filter((line): line is CartItem => line !== null);
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), []);

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    const loadCart = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("cart_items")
          .select("product_id, quantity")
          .eq("user_id", user.id);

        if (!active) return;

        if (error || !data) {
          setItems([]);
          setHydrated(true);
          return;
        }

        const rows = data.map((row) => ({ productId: String(row.product_id), quantity: Number(row.quantity) }));
        setItems(toCartItems(rows, productMap));
        setHydrated(true);
        return;
      }

      const response = await fetch("/api/cart/anonymous", { credentials: "include" });
      if (!active) return;

      if (!response.ok) {
        setItems([]);
        setHydrated(true);
        return;
      }

      const payload = (await response.json()) as { items?: CartWireItem[] };
      setItems(toCartItems(payload.items ?? [], productMap));
      setHydrated(true);
    };

    setHydrated(false);
    void loadCart();

    return () => {
      active = false;
    };
  }, [user, authLoading, productMap]);

  useEffect(() => {
    if (!hydrated || authLoading) {
      return;
    }

    let active = true;

    const syncAuthenticated = async () => {
      if (!user) return;

      const payload = items.map((item) => ({
        user_id: user.id,
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const { data: existing } = await supabase
        .from("cart_items")
        .select("product_id")
        .eq("user_id", user.id);

      if (!active) return;

      const currentIds = new Set(payload.map((p) => p.product_id));
      const staleIds = (existing ?? [])
        .map((row) => String(row.product_id))
        .filter((id) => !currentIds.has(id));

      if (staleIds.length > 0) {
        await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id)
          .in("product_id", staleIds);
      }

      if (payload.length > 0) {
        await supabase.from("cart_items").upsert(payload, { onConflict: "user_id,product_id" });
      }
    };

    const syncAnonymous = async () => {
      if (user) return;

      const payload = {
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      await fetch("/api/cart/anonymous", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    };

    if (user) {
      void syncAuthenticated();
    } else {
      void syncAnonymous();
    }

    return () => {
      active = false;
    };
  }, [items, user, hydrated, authLoading]);

  const addItem = useCallback((product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.casePrice * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
