import axios from 'src/utils/axios';

/**
 * Create a WooshPay checkout session (card-only). Returns URL to redirect the user to pay.
 * Backend uses PAYMENT_SECRET_KEY; this call is authenticated as the current user.
 */
export async function createCheckoutSession({ items, successUrl, cancelUrl, currency = 'sgd' }) {
  const response = await axios.post('/payments/create-checkout-cards', {
    items: items.map((item) => ({
      id: item.id,
      name: item.name || 'Course',
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
    })),
    successUrl,
    cancelUrl,
    currency,
  });
  return response.data;
}

/**
 * Confirm payment after redirect. Backend will enroll user and create order if not already done by webhook.
 * Call this on the checkout success page with session_id from URL.
 */
export async function confirmPayment(sessionId) {
  const response = await axios.post('/payments/confirm-payment', { sessionId });
  return response.data;
}

/**
 * Mark payment as failed when user returns from WooshPay without completing.
 * Creates/updates order status to Failed. Call when user lands on cancel_url with ref.
 */
export async function markPaymentFailed(ref) {
  const response = await axios.post('/payments/mark-failed', { ref });
  return response.data;
}

export async function getPaymentStatus(ref) {
  const response = await axios.get('/payments/status', { params: { ref } });
  return response.data;
}
