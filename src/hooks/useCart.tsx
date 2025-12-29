import { useState, useEffect, useCallback } from 'react';

interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  size: string;
  color: string;
  price: number;
  image: string;
  quantity: number;
}

const CART_KEY = 'stepup_cart';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CART_KEY);
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  const saveCart = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem(CART_KEY, JSON.stringify(newItems));
  };

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.variantId === item.variantId);
      let newItems;
      
      if (existing) {
        newItems = prev.map(i => 
          i.variantId === item.variantId 
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      } else {
        newItems = [...prev, item];
      }
      
      localStorage.setItem(CART_KEY, JSON.stringify(newItems));
      return newItems;
    });
    setIsOpen(true);
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setItems(prev => {
      const newItems = quantity <= 0
        ? prev.filter(i => i.variantId !== variantId)
        : prev.map(i => i.variantId === variantId ? { ...i, quantity } : i);
      
      localStorage.setItem(CART_KEY, JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems(prev => {
      const newItems = prev.filter(i => i.variantId !== variantId);
      localStorage.setItem(CART_KEY, JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_KEY);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return {
    items,
    totalItems,
    subtotal,
    isOpen,
    setIsOpen,
    addItem,
    updateQuantity,
    removeItem,
    clearCart
  };
}
