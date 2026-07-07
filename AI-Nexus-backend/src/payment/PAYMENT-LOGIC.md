# Payment Logic: Testing vs Production

Customer money is critical. This document explains the correct behaviour and env settings.

---

## 1. Payments table (`payments`) — canonical payment status

Payment lifecycle is stored in the **`payments`** table (one row per `clientReferenceId`). Orders remain the fulfillment/enrollment record; payments are the audit trail for money status.

| status                       | Meaning |
|------------------------------|--------|
| pending                      | Checkout session created; waiting for customer / provider. |
| paid                         | Payment verified (webhook, confirm-payment, or reconcile). |
| failed                       | Provider reported failure (or non-cancel failure). |
| canceled                     | Customer canceled / abandoned checkout (`mark-failed`). |
| webhook_verification_failed  | Webhook signature verification failed; not fulfilled from webhook. |
| refunded                     | Payment refunded (manual / future support). |

Key columns: `userId`, `orderId`, `clientReferenceId` (unique), `status`, `amount`, `currency`, `courseIds`, `items`, `wooshpaySessionId`, `wooshpayPaymentIntentId`, `eventType`, `source`, `failureReason`, `paidAt`, `createdAt`, `updatedAt`.

`source` records how the row was last written: `checkout`, `webhook`, `confirm_payment`, `mark_failed`, `status_reconcile`, `backfill`.

On startup, existing **orders** rows are backfilled into `payments` (idempotent by `clientReferenceId`) so historical payment status is preserved.

---

## 2. Order statuses (orders table)

| status     | paymentStatus                 | Meaning |
|-----------|-------------------------------|--------|
| completed | paid                          | Payment verified (webhook or confirm-payment). User enrolled, access granted. |
| failed    | canceled                      | User returned from WooshPay without paying (cancel/back). |
| failed    | webhook_verification_failed    | Webhook signature verification failed; we refused the payment and did not enroll. |

---

## 3. Flows

### A) Customer pays successfully (WooshPay)

1. WooshPay sends webhook to our `/api/payments/webhook`.
2. We verify the webhook signature with `PAYMENT_WEBHOOK_SECRET`.
3. **If verified:** we create order (status **completed**), enroll user, return 200.
4. **If not verified (see TEST vs PRODUCTION below):** we either accept anyway (test) or refuse and record **failed** order (production).
5. Customer is also redirected to **success URL** → frontend calls `confirm-payment` with `session_id` → we fetch session from WooshPay API and, if paid, create order + enroll (idempotent). So even if the webhook was rejected, the customer gets access when they land on the success page.

### B) Customer cancels / returns without paying

1. WooshPay redirects to **cancel URL** with `?payment=canceled&ref=...`.
2. Frontend shows “Order failed” and calls `POST /payments/mark-failed` with `ref`.
3. We create order with status **failed**, paymentStatus **canceled**. No enrollment.

### C) Webhook signature verification fails (PRODUCTION only)

1. We do **not** fulfill (no enrollment, no completed order).
2. We create an order with status **failed**, paymentStatus **webhook_verification_failed** (for audit).
3. We return 401 to WooshPay.
4. Customer can still get access if they land on the **success page** (confirm-payment uses WooshPay API, not the webhook). If they never hit the success page, support must manually fulfill or refund from WooshPay dashboard.

---

## 4. TEST (development / staging)

**Goal:** Payments work even when webhook secret is wrong or WooshPay test env differs.

| Env variable | Value | Purpose |
|--------------|--------|--------|
| PAYMENT_SECRET_KEY | sk_test_... | WooshPay test secret key. |
| PAYMENT_WEBHOOK_SECRET | (match WooshPay Dashboard → Webhooks) | So verification passes when possible. |
| PAYMENT_WEBHOOK_VERIFY | true | Verify webhooks. |
| PAYMENT_WEBHOOK_ACCEPT_UNVERIFIED | **true** | If verification fails, still create order so you don’t get “payment success but order failed” during testing. |
| NODE_ENV | development (or not production) | Ensures ACCEPT_UNVERIFIED is honoured (only in non-production). |
| PAYMENT_SUCCESS_URL / PAYMENT_CANCEL_URL | Your test frontend URLs | Where to redirect after payment / cancel. |

**Behaviour in TEST:**

- If webhook signature **passes** → create order (completed), enroll user.
- If webhook signature **fails** → still create order (completed), enroll user (so test flows don’t block). Fix the secret when you can.

---

## 5. PRODUCTION (live)

**Goal:** Only accept payments we can trust. Never honour unverified webhooks.

| Env variable | Value | Purpose |
|--------------|--------|--------|
| PAYMENT_SECRET_KEY | sk_live_... | WooshPay **live** secret key. |
| PAYMENT_WEBHOOK_SECRET | **Exact** copy from WooshPay Dashboard → Webhooks → Signing secret | Must match so all real payment webhooks verify. |
| PAYMENT_WEBHOOK_VERIFY | **true** | Always verify webhooks in production. |
| PAYMENT_WEBHOOK_ACCEPT_UNVERIFIED | **false** (or unset) | In production this is **ignored**: we never accept unverified webhooks (code enforces when NODE_ENV=production). |
| NODE_ENV | **production** | Enables strict behaviour: unverified webhooks are never accepted. |
| PAYMENT_SUCCESS_URL / PAYMENT_CANCEL_URL | Live frontend URLs (https) | Where customers are sent after payment / cancel. |

**Behaviour in PRODUCTION:**

- If webhook signature **passes** → create order (completed), enroll user.
- If webhook signature **fails** → do **not** fulfill; create order (failed, paymentStatus `webhook_verification_failed`); return 401. Customer can still get access via the success page (confirm-payment). If they don’t reach it, handle via support (manual fulfill or refund).

---

## 6. Checklist before going live

1. Use **live** WooshPay keys: `PAYMENT_SECRET_KEY=sk_live_...`.
2. Set **NODE_ENV=production**.
3. In WooshPay Dashboard (live), create a webhook endpoint for your production URL and copy the **Signing secret** into `PAYMENT_WEBHOOK_SECRET` (no extra spaces).
4. Set `PAYMENT_WEBHOOK_ACCEPT_UNVERIFIED=false` or leave unset (production ignores it).
5. Set `PAYMENT_SUCCESS_URL` and `PAYMENT_CANCEL_URL` to your live frontend (https).
6. Test a real payment once; check that the order is **completed** and the user is enrolled.

---

## 7. Summary

- **Testing:** Use test keys, set `PAYMENT_WEBHOOK_ACCEPT_UNVERIFIED=true` and non-production `NODE_ENV` so failed verification still creates the order and you can test without “payment success but order failed”.
- **Production:** Use live keys, `NODE_ENV=production`, correct `PAYMENT_WEBHOOK_SECRET`. Unverified webhooks are never accepted; we record a failed order and rely on success-page confirm or manual support to protect customer money and access.
