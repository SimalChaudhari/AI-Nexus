import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { useParams } from 'src/routes/hooks';
import { intlUsersService } from 'src/services/intl-users.service';
import { IntlUsersDetailsView } from 'src/sections/dashboard/international/view';

// ----------------------------------------------------------------------

const metadata = { title: `International user details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();
  const [user, setUser] = useState(null);
  const [paymentLatest, setPaymentLatest] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!id) {
      setUser(null);
      setError(new Error('Missing user id'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, pay] = await Promise.all([
        intlUsersService.getUser(id),
        intlUsersService.getUserPayments(id).catch(() => ({ latest: null, payments: [] })),
      ]);
      setUser(data);
      setPaymentLatest(pay?.latest || null);
      setPayments(Array.isArray(pay?.payments) ? pay.payments : []);
    } catch (err) {
      setUser(null);
      setPaymentLatest(null);
      setPayments([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <IntlUsersDetailsView
        user={user}
        loading={loading}
        error={error}
        paymentLatest={paymentLatest}
        payments={payments}
      />
    </>
  );
}
