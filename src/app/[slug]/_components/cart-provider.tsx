"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { priceCart } from "@/lib/pricing";
import type {
  CartItem,
  CartPizza,
  CartProduct,
  Menu,
  PricedItem,
} from "@/lib/types";

import { uid } from "@/lib/utils";

/** Omit sobre união precisa distribuir, senão some com os campos de cada braço. */
type NewCartItem = Omit<CartPizza, "uid"> | Omit<CartProduct, "uid">;

type CartContextValue = {
  menu: Menu;
  items: CartItem[];
  priced: PricedItem[];
  subtotal: number;
  count: number;
  ready: boolean;
  add: (item: NewCartItem) => void;
  remove: (uid: string) => void;
  setQuantity: (uid: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(slug: string) {
  return `fornalha:cart:${slug}`;
}

export function CartProvider({
  menu,
  children,
}: {
  menu: Menu;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // O carrinho sobrevive ao refresh — pizza se escolhe devagar, em várias abas.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(menu.tenant.slug));
      // localStorage só existe depois da montagem: hidratar aqui é o caminho.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      // localStorage indisponível (aba anônima travada): segue com carrinho vazio
    }
    setReady(true);
  }, [menu.tenant.slug]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey(menu.tenant.slug), JSON.stringify(items));
    } catch {
      // sem persistência, mas a sessão atual continua funcionando
    }
  }, [items, ready, menu.tenant.slug]);

  const add = useCallback((item: NewCartItem) => {
    setItems((prev) => [...prev, { ...item, uid: uid() } as CartItem]);
  }, []);

  const remove = useCallback((target: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== target));
  }, []);

  const setQuantity = useCallback((target: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.uid !== target)
        : prev.map((i) => (i.uid === target ? { ...i, quantity } : i)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  // Se o cardápio mudou embaixo do carrinho, ignoramos o item quebrado aqui;
  // o servidor faz a validação de verdade no checkout.
  const priced = useMemo(() => {
    try {
      return priceCart(menu, items);
    } catch {
      return items.flatMap((item) => {
        try {
          return priceCart(menu, [item]);
        } catch {
          return [];
        }
      });
    }
  }, [menu, items]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = priced.reduce((acc, i) => acc + i.totalPrice, 0);
    const count = items.reduce((acc, i) => acc + i.quantity, 0);
    return {
      menu,
      items,
      priced,
      subtotal,
      count,
      ready,
      add,
      remove,
      setQuantity,
      clear,
    };
  }, [menu, items, priced, ready, add, remove, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
