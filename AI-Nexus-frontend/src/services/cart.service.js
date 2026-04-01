import axios from 'src/utils/axios';

/**
 * Get current user's cart from the database (requires auth).
 * @returns {{ items: Array, discount?: number }}
 */
export async function getCart() {
  const response = await axios.get('/cart');
  return response.data;
}

/**
 * Replace entire cart in the database (requires auth).
 * @param {Array<{ id, name, price, quantity, coverUrl? }>} items
 * @param {number} [discount] - optional discount amount
 * @returns {{ items: Array, discount?: number }}
 */
export async function setCart(items, discount) {
  const payload = { items: items || [] };
  if (typeof discount === 'number' && !Number.isNaN(discount)) payload.discount = discount;
  const response = await axios.put('/cart', payload);
  return response.data;
}

/**
 * Add one item to cart (requires auth). If item id already exists, quantity is increased.
 * @param {Object} item - { id, name?, price, quantity?, coverUrl? }
 * @returns {{ items: Array }}
 */
export async function addCartItem(item) {
  const response = await axios.post('/cart/items', item || {});
  return response.data;
}

/**
 * Remove item from cart by course/item id (requires auth).
 * @param {string} itemId - course id (or item id)
 * @returns {{ items: Array }}
 */
export async function removeCartItem(itemId) {
  const response = await axios.delete(`/cart/items/${encodeURIComponent(itemId)}`);
  return response.data;
}

/**
 * Update item quantity in cart (requires auth).
 * @param {string} itemId - course id (or item id)
 * @param {number} quantity
 * @returns {{ items: Array }}
 */
export async function updateCartItemQuantity(itemId, quantity) {
  const response = await axios.patch(`/cart/items/${encodeURIComponent(itemId)}`, {
    quantity: Number(quantity) || 1,
  });
  return response.data;
}
