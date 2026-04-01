import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// ----------------------------------------------------------------------

const STORAGE_KEY = 'learning_cart';

const LearningCartContext = createContext(null);

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCartToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function LearningCartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(loadCartFromStorage());
  }, []);

  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const addToCart = useCallback((course) => {
    const { id, title, image, amount, freeOrPaid } = course;
    setItems((prev) => {
      if (prev.some((i) => i.id === id)) return prev;
      return [...prev, { id, title, image: image || '', amount: amount ?? 0, freeOrPaid: freeOrPaid ?? false }];
    });
  }, []);

  const removeFromCart = useCallback((courseId) => {
    setItems((prev) => prev.filter((i) => i.id !== courseId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (courseId) => items.some((i) => i.id === courseId),
    [items]
  );

  const value = useMemo(
    () => ({
      cartItems: items,
      cartCount: items.length,
      addToCart,
      removeFromCart,
      clearCart,
      isInCart,
    }),
    [items, addToCart, removeFromCart, clearCart, isInCart]
  );

  return (
    <LearningCartContext.Provider value={value}>
      {children}
    </LearningCartContext.Provider>
  );
}

export function useLearningCart() {
  const context = useContext(LearningCartContext);
  if (!context) {
    throw new Error('useLearningCart must be used within LearningCartProvider');
  }
  return context;
}
