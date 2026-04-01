import { useContext } from 'react';

import { CheckoutContext } from './checkout-provider';

// ----------------------------------------------------------------------

export function useCheckoutContext() {
  const context = useContext(CheckoutContext);
  // Context has a default value in createContext, so we always get a valid object
  // (avoids crash when browser back lands before provider is ready)
  return context;
}
