import axios from 'src/utils/axios';

/**
 * Fetch all orders (admin). Requires Admin role.
 */
export async function getOrders() {
  const response = await axios.get('/orders');
  return response.data;
}

/**
 * Fetch a single order by id (admin). Requires Admin role.
 */
export async function getOrderById(id) {
  const response = await axios.get(`/orders/${id}`);
  return response.data?.data ?? response.data;
}

export async function deleteOrderById(id) {
  const response = await axios.delete(`/orders/${id}`);
  return response.data;
}

export async function deleteOrdersByIds(ids) {
  const response = await axios.delete('/orders', { data: { ids } });
  return response.data;
}
