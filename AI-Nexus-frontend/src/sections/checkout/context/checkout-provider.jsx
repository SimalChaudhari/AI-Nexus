import { useMemo, Suspense, useEffect, useCallback, createContext, useState, useRef } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams, usePathname } from 'src/routes/hooks';

import { PRODUCT_CHECKOUT_STEPS } from 'src/_mock/_product';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from 'src/auth/hooks';
import { courseService } from 'src/services/course.service';
import { getCart, setCart, addCartItem, removeCartItem } from 'src/services/cart.service';

// ----------------------------------------------------------------------

const defaultContextValue = {
  items: [],
  subtotal: 0,
  total: 0,
  discount: 0,
  shipping: 0,
  billing: null,
  totalItems: 0,
  canReset: false,
  onReset: () => {},
  onUpdate: () => {},
  onUpdateField: () => {},
  completed: false,
  onAddToCart: () => {},
  onDeleteCart: () => {},
  deletingItemIds: new Set(),
  onIncreaseQuantity: () => {},
  onDecreaseQuantity: () => {},
  onCreateBilling: () => {},
  onApplyDiscount: () => {},
  onApplyShipping: () => {},
  activeStep: 0,
  initialStep: () => {},
  onBackStep: () => {},
  onNextStep: () => {},
  onGotoStep: () => {},
};

export const CheckoutContext = createContext(defaultContextValue);

export const CheckoutConsumer = CheckoutContext.Consumer;

const DISCOUNT_DISABLED = true;

const GUEST_CART_KEY = 'ai_nexus_guest_cart';

function getGuestCart() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(GUEST_CART_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const discount = typeof parsed?.discount === 'number' ? parsed.discount : 0;
    return { items, discount };
  } catch {
    return null;
  }
}

function setGuestCart(items, discount = 0) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ items: items || [], discount }));
    }
  } catch {
    // ignore
  }
}

function clearGuestCart() {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // ignore
  }
}

const initialState = {
  items: [],
  subtotal: 0,
  total: 0,
  discount: 0,
  shipping: 0,
  billing: null,
  totalItems: 0,
};

/** Same idea as header `isCustomerFacingRoute`: cart badge/API only matter outside admin + legacy dashboard. */
function shouldSyncRemoteCart(pathname) {
  if (!pathname || typeof pathname !== 'string') return true;
  if (pathname.startsWith('/admin')) return false;
  if (pathname.startsWith('/dashboard')) return false;
  return true;
}

function normalizeGuestCartItem(item) {
  if (!item?.id) return null;
  return {
    id: item.id,
    name: item.name,
    coverUrl: item.coverUrl,
    price: Number(item.price) || 0,
    quantity: 1,
  };
}

async function filterEnrolledCartItems(items, discount) {
  const enrolledIds = await courseService.getEnrolledCourseIds();
  if (!Array.isArray(enrolledIds)) return items;
  const enrolledSet = new Set(enrolledIds);
  const filtered = items.filter((item) => !enrolledSet.has(item.id));
  if (filtered.length < items.length) {
    await setCart(filtered, discount).catch(() => {});
  }
  return filtered;
}

// ----------------------------------------------------------------------

export function CheckoutProvider({ children }) {
  return (
    <Suspense fallback={<SplashScreen />}>
      <Container>{children}</Container>
    </Suspense>
  );
}

// ----------------------------------------------------------------------

function Container({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authenticated } = useAuthContext();
  const activeStep = Number(searchParams.get('step'));

  const [state, setState] = useState(initialState);
  const [deletingItemIds, setDeletingItemIds] = useState(new Set());
  const prevAuthenticatedRef = useRef(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  /** Previous pathname (for cart sync). Used to avoid GET /cart on every in-app navigation between learning/catalog pages. */
  const prevPathForCartRef = useRef(null);

  const setField = useCallback((name, value) => {
    setState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const completed = activeStep === PRODUCT_CHECKOUT_STEPS.length;
  const canReset = state.items.length > 0 || state.billing != null;

  // Recompute totals whenever items (or discount/shipping) change
  const stateWithTotals = useMemo(() => {
    const totalItems = state.items.reduce((total, item) => total + (item.quantity || 1), 0);
    const subtotal = state.items.reduce((total, item) => total + (item.quantity || 1) * (Number(item.price) || 0), 0);
    const effectiveDiscount = DISCOUNT_DISABLED ? 0 : state.discount;
    const total = subtotal - effectiveDiscount + (state.shipping || 0);
    return {
      ...state,
      totalItems,
      subtotal,
      total,
    };
  }, [state]);

  useEffect(() => {
    if (DISCOUNT_DISABLED && state.discount !== 0) {
      setField('discount', 0);
    }
  }, [setField, state.discount]);

  const syncRemoteCart = useCallback(async (guestItems = []) => {
    if (!shouldSyncRemoteCart(pathnameRef.current)) return null;

    const data = await getCart();
    let items = Array.isArray(data?.items) ? data.items : [];
    let discount = typeof data?.discount === 'number' ? data.discount : 0;

    const pendingGuestItems = (Array.isArray(guestItems) ? guestItems : [])
      .map(normalizeGuestCartItem)
      .filter(Boolean);
    if (pendingGuestItems.length > 0) {
      const ids = new Set(items.map((item) => item.id));
      const toAdd = pendingGuestItems.filter((item) => !ids.has(item.id));
      if (toAdd.length > 0) {
        const merged = await setCart([...items, ...toAdd], discount);
        items = Array.isArray(merged?.items) ? merged.items : [...items, ...toAdd];
        discount = typeof merged?.discount === 'number' ? merged.discount : discount;
      }
    }

    items = await filterEnrolledCartItems(items, discount);
    return { items, discount };
  }, []);

  const loadCartFromApi = useCallback(() => {
    if (!authenticated) return;
    syncRemoteCart()
      .then((next) => {
        if (!next) return;
        setState((prev) => ({ ...prev, items: next.items, discount: next.discount }));
      })
      .catch(() => {});
  }, [authenticated, syncRemoteCart]);

  // Guest cart: hydrate when logged out; on login merge guest items then load server cart
  useEffect(() => {
    if (authenticated) {
      const wasGuest = prevAuthenticatedRef.current !== true;
      prevAuthenticatedRef.current = true;

      if (!wasGuest) {
        clearGuestCart();
        return undefined;
      }

      const guest = getGuestCart();
      const guestItems = guest?.items || [];
      clearGuestCart();

      let cancelled = false;
      syncRemoteCart(guestItems)
        .then((next) => {
          if (cancelled || !next) return;
          setState((prev) => ({ ...prev, items: next.items, discount: next.discount }));
        })
        .catch(() => {});

      return () => {
        cancelled = true;
      };
    }

    if (prevAuthenticatedRef.current === true) {
      setState(initialState);
      clearGuestCart();
      prevAuthenticatedRef.current = false;
      return undefined;
    }

    const guest = getGuestCart();
    if (guest && (guest.items.length > 0 || guest.discount !== 0)) {
      setState((prev) => (prev.items.length === 0 ? { ...prev, ...guest } : prev));
    }
    return undefined;
  }, [authenticated, syncRemoteCart]);

  // Load cart from API only when entering the customer-facing shell (first load, from admin, after login),
  // not on every route change (e.g. course list → course detail). Mutations use POST/DELETE responses to update state.
  useEffect(() => {
    if (!authenticated) {
      prevPathForCartRef.current = null;
      return () => {};
    }

    const prevPath = prevPathForCartRef.current;
    const nowSync = shouldSyncRemoteCart(pathname);
    const prevSync = prevPath != null && shouldSyncRemoteCart(prevPath);

    prevPathForCartRef.current = pathname;

    if (!nowSync) {
      return () => {};
    }

    if (prevSync) {
      return () => {};
    }

    let cancelled = false;
    syncRemoteCart()
      .then((next) => {
        if (cancelled || !next) return;
        setState((prev) => ({ ...prev, items: next.items, discount: next.discount }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authenticated, pathname, syncRemoteCart]);

  // Re-fetch cart when user returns to the page (e.g. browser back from WooshPay) so cart shows without refresh
  useEffect(() => {
    const onPageShow = (event) => {
      if (!authenticated) return;
      if (!shouldSyncRemoteCart(pathnameRef.current)) return;
      if (event.persisted) loadCartFromApi();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [authenticated, loadCartFromApi]);

  const initialStep = useCallback(() => {
    if (!activeStep) {
      const href = createUrl('go', 0);
      router.push(href);
    }
  }, [activeStep, router]);

  const onBackStep = useCallback(() => {
    if (activeStep <= 0) {
      router.push(paths.learning);
      return;
    }
    const href = createUrl('back', activeStep);
    router.push(href);
  }, [activeStep, router]);

  const onNextStep = useCallback(() => {
    const href = createUrl('next', activeStep);
    router.push(href);
  }, [activeStep, router]);

  const onGotoStep = useCallback(
    (step) => {
      const href = createUrl('go', step);
      router.push(href);
    },
    [router]
  );

  const onAddToCart = useCallback(
    (newItem) => {
      const payload = {
        id: newItem.id,
        name: newItem.name,
        coverUrl: newItem.coverUrl,
        price: Number(newItem.price) || 0,
        quantity: 1,
      };
      if (authenticated) {
        addCartItem(payload)
          .then((data) => {
            const items = Array.isArray(data?.items) ? data.items : [];
            setState((prev) => ({ ...prev, items }));
          })
          .catch(() => {});
        return;
      }
      setState((prev) => {
        const { items } = prev;
        if (items.some((item) => item.id === newItem.id)) return prev;
        const next = { ...prev, items: [...items, payload] };
        setGuestCart(next.items, next.discount);
        return next;
      });
    },
    [authenticated]
  );

  const onDeleteCart = useCallback(
    (itemId) => {
      if (authenticated) {
        setDeletingItemIds((prev) => {
          const next = new Set(prev);
          next.add(itemId);
          return next;
        });
        removeCartItem(itemId)
          .then((data) => {
            const items = Array.isArray(data?.items) ? data.items : [];
            setState((prev) => ({ ...prev, items }));
          })
          .catch(() => {})
          .finally(() => {
            setDeletingItemIds((prev) => {
              const next = new Set(prev);
              next.delete(itemId);
              return next;
            });
          });
        return;
      }
      setState((prev) => {
        const next = {
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId),
        };
        setGuestCart(next.items, next.discount);
        return next;
      });
    },
    [authenticated]
  );

  const onIncreaseQuantity = useCallback(() => {}, []);
  const onDecreaseQuantity = useCallback(() => {}, []);

  const onCreateBilling = useCallback(
    (address) => {
      setField('billing', address);

      onNextStep();
    },
    [onNextStep, setField]
  );

  const onApplyDiscount = useCallback(
    (discountAmount) => {
      if (DISCOUNT_DISABLED) return;
      setState((prev) => {
        if (authenticated) setCart(prev.items, discountAmount).catch(() => {});
        return { ...prev, discount: discountAmount };
      });
    },
    [authenticated]
  );

  const onApplyShipping = useCallback(
    (shipping) => {
      setField('shipping', shipping);
    },
    [setField]
  );

  const onReset = useCallback(
    (redirectTo) => {
      if (completed) {
        setState(initialState);
        if (authenticated) setCart([], 0).catch(() => {});
        else clearGuestCart();
        router.push(redirectTo ?? paths.product.root);
      }
    },
    [completed, router, authenticated]
  );

  const memoizedValue = useMemo(
    () => ({
      ...stateWithTotals,
      canReset,
      onReset,
      onUpdate: setState,
      onUpdateField: setField,
      //
      completed,
      deletingItemIds,
      //
      onAddToCart,
      onDeleteCart,
      //
      onIncreaseQuantity,
      onDecreaseQuantity,
      //
      onCreateBilling,
      onApplyDiscount,
      onApplyShipping,
      //
      activeStep,
      initialStep,
      onBackStep,
      onNextStep,
      onGotoStep,
    }),
    [
      stateWithTotals,
      onReset,
      canReset,
      setField,
      completed,
      deletingItemIds,
      setState,
      activeStep,
      onBackStep,
      onGotoStep,
      onNextStep,
      initialStep,
      onAddToCart,
      onDeleteCart,
      onApplyDiscount,
      onApplyShipping,
      onCreateBilling,
      onDecreaseQuantity,
      onIncreaseQuantity,
    ]
  );

  return <CheckoutContext.Provider value={memoizedValue}>{children}</CheckoutContext.Provider>;
}

// ----------------------------------------------------------------------

function createUrl(type, activeStep) {
  const step = { back: activeStep - 1, next: activeStep + 1, go: activeStep }[type];

  const stepParams = new URLSearchParams({ step: `${step}` }).toString();

  return `${paths.product.checkout}?${stepParams}`;
}
