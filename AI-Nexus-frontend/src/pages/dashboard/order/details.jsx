import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';
import { getOrderById } from 'src/services/order.service';
import { OrderDetailsView } from 'src/sections/order/view';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { LoadingScreen } from 'src/components/loading-screen';
import { paths } from 'src/routes/paths';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

const metadata = { title: `Order details | Dashboard - ${CONFIG.site.name}` };

function mapApiOrderToView(apiOrder) {
  if (!apiOrder) return null;
  const items = apiOrder.items || [];
  const mappedItems = items.length
    ? items.map((i, idx) => ({
        id: i.id || `item-${idx}`,
        name: i.name || 'Course',
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
        sku: i.id,
        coverUrl: null,
      }))
    : (apiOrder.courseIds || []).map((cid) => ({
        id: cid,
        name: 'Course',
        price: 0,
        quantity: 1,
        sku: cid,
        coverUrl: null,
      }));
  const totalAmount = Number(apiOrder.totalAmount) || 0;
  return {
    id: apiOrder.id,
    orderNumber: apiOrder.orderNumber || `#${(apiOrder.id || '').slice(0, 8)}`,
    createdAt: apiOrder.createdAtMs || apiOrder.createdAtUtc || apiOrder.createdAt,
    status: apiOrder.status || 'completed',
    items: mappedItems,
    subtotal: totalAmount,
    totalAmount,
    taxes: 0,
    shipping: 0,
    discount: 0,
    history: {
      orderTime: apiOrder.createdAtMs || apiOrder.createdAtUtc || apiOrder.createdAt,
      paymentTime: apiOrder.createdAtMs || apiOrder.createdAtUtc || apiOrder.createdAt,
      timeline: [{ title: 'Payment completed (WooshPay)', time: apiOrder.createdAtMs || apiOrder.createdAtUtc || apiOrder.createdAt }],
    },
    customer: apiOrder.customer
      ? { ...apiOrder.customer, avatarUrl: apiOrder.customer.avatarUrl ?? null, ipAddress: null }
      : { name: '—', email: '—', avatarUrl: null, ipAddress: null },
    delivery: apiOrder.wooshpaySessionId
      ? { shipBy: 'WooshPay', speedy: 'Card', trackingNumber: apiOrder.wooshpaySessionId }
      : null,
    payment: {
      cardType: 'card',
      cardNumber: apiOrder.paymentStatus ? `WooshPay (${apiOrder.paymentStatus})` : 'WooshPay',
      audit: {
        orderId: apiOrder.id,
        clientReferenceId: apiOrder.clientReferenceId || '—',
        wooshpaySessionId: apiOrder.wooshpaySessionId || '—',
        wooshpayPaymentIntentId: apiOrder.wooshpayPaymentIntentId || '—',
        orderStatus: apiOrder.status || '—',
        paymentStatus: apiOrder.paymentStatus || '—',
        source: apiOrder.eventType || 'confirm-payment',
        createdAt: apiOrder.createdAtMs || apiOrder.createdAtUtc || apiOrder.createdAt || '—',
      },
    },
    shippingAddress: null,
  };
}

export default function Page() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return () => {};
    }
    let cancelled = false;
    getOrderById(id)
      .then((data) => {
        if (!cancelled) setOrder(mapApiOrderToView(data));
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          toast.error(err?.response?.data?.message || err?.message || 'Failed to load order');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <>
        <Helmet><title>{metadata.title}</title></Helmet>
        <DashboardContent>
          <CustomBreadcrumbs
            heading="Order details"
            links={[
              { name: 'Dashboard', href: paths.dashboard.root },
              { name: 'Order', href: paths.admin.order.root },
              { name: 'Details' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
          />
          <LoadingScreen />
        </DashboardContent>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Helmet><title>{metadata.title}</title></Helmet>
        <DashboardContent>
          <CustomBreadcrumbs
            heading="Order not found"
            links={[
              { name: 'Dashboard', href: paths.dashboard.root },
              { name: 'Order', href: paths.admin.order.root },
              { name: 'Details' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
          />
          <div style={{ padding: 32, textAlign: 'center' }}>Order not found.</div>
        </DashboardContent>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <OrderDetailsView order={order} />
    </>
  );
}
