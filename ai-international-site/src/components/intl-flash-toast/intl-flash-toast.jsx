'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { consumeIntlFlashToast } from 'src/auth/intl-session';

function IntlFlashToastInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const show = () => {
      const next = consumeIntlFlashToast();
      if (next?.message) setToast(next);
    };

    show();
    const t = window.setTimeout(show, 80);
    return () => window.clearTimeout(t);
  }, [pathname, searchParams]);

  return (
    <Snackbar
      open={Boolean(toast?.message)}
      autoHideDuration={5000}
      onClose={() => setToast(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        onClose={() => setToast(null)}
        severity={toast?.severity === 'error' ? 'error' : 'success'}
        variant="filled"
        sx={{ width: '100%', fontWeight: 600 }}
      >
        {toast?.message}
      </Alert>
    </Snackbar>
  );
}

export function IntlFlashToast() {
  return (
    <Suspense fallback={null}>
      <IntlFlashToastInner />
    </Suspense>
  );
}
