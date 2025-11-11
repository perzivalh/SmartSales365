import { createContext, useCallback, useEffect, useMemo, useState } from "react";

import type { ReactNode } from "react";

const CART_STORAGE_KEY = "smartsales365.cart.v2";

export type CartItem = {
  productId: string;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number;
  promotionLabel?: string | null;
  imageUrl?: string | null;
  quantity: number;
  stock?: number;
};

export type CartItemInput = {
  productId: string;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number;
  promotionLabel?: string | null;
  imageUrl?: string | null;
  stock?: number;
};

export type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  originalSubtotal: number;
  savings: number;
  addItem: (item: CartItemInput, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

function loadInitialCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => Boolean(item?.productId && item?.quantity));
  } catch (error) {
    console.error("No se pudo cargar el carrito desde almacenamiento local", error);
    return [];
  }
}

function persistCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("No se pudo guardar el carrito", error);
  }
}

export function CartProvider({ children }: Props) {
  const [items, setItems] = useState<CartItem[]>(() => loadInitialCart());

  useEffect(() => {
    persistCart(items);
  }, [items]);

  const addItem = useCallback((input: CartItemInput, quantity = 1) => {
    setItems((previous) => {
      const existing = previous.find((item) => item.productId === input.productId);
      const maxStock = input.stock ?? existing?.stock ?? 999;
      if (existing) {
        const updatedQuantity = Math.min(existing.quantity + quantity, maxStock);
        return previous.map((item) =>
          item.productId === input.productId
            ? {
                ...item,
                quantity: updatedQuantity,
                name: input.name,
                sku: input.sku,
                price: input.price,
                originalPrice: input.originalPrice ?? input.price,
                promotionLabel: input.promotionLabel ?? null,
                imageUrl: input.imageUrl,
                stock: maxStock,
              }
            : item,
        );
      }
      return [
        ...previous,
        {
          productId: input.productId,
          name: input.name,
          sku: input.sku,
          price: input.price,
          originalPrice: input.originalPrice ?? input.price,
          promotionLabel: input.promotionLabel ?? null,
          imageUrl: input.imageUrl,
          quantity: Math.min(quantity, maxStock),
          stock: maxStock,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((previous) => {
      if (quantity <= 0) {
        return previous.filter((item) => item.productId !== productId);
      }
      return previous.map((item) => {
        if (item.productId !== productId) return item;
        const maxStock = item.stock ?? 999;
        return { ...item, quantity: Math.min(quantity, maxStock) };
      });
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((previous) => previous.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const originalSubtotal = items.reduce(
      (acc, item) => acc + (item.originalPrice ?? item.price) * item.quantity,
      0,
    );
    const savings = Math.max(originalSubtotal - subtotal, 0);
    return {
      items,
      totalItems,
      subtotal,
      originalSubtotal,
      savings,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    };
  }, [items, addItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export { CartContext };
