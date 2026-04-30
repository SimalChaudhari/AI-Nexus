import Stack from '@mui/material/Stack';

import { CheckoutCartProduct } from './checkout-cart-product';

// ----------------------------------------------------------------------

export function CheckoutCartProductList({ products, onDelete, deletingItemIds = new Set() }) {
  return (
    <Stack spacing={1} sx={{ p: 1.25 }}>
      {products.map((row) => (
        <CheckoutCartProduct
          key={row.id}
          row={row}
          deleting={deletingItemIds.has(row.id)}
          onDelete={() => onDelete(row.id)}
        />
      ))}
    </Stack>
  );
}
