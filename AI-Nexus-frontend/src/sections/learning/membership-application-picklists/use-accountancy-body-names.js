import { useCallback, useRef, useState } from 'react';

import { fetchAccountancyBodyNameOptions } from 'src/api/membership-application';
import { ensureMembershipSalesforceSession } from 'src/utils/membership-salesforce-auth';

import { normalizeAccountancyBodyNameOptions } from './utils';

// ----------------------------------------------------------------------

export function useMembershipAccountancyBodyNames({ enabled, emptyErrorMessage }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (!enabled || loadedRef.current || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const session = ensureMembershipSalesforceSession();
      const response = await fetchAccountancyBodyNameOptions({
        socialAccessToken: session.socialToken,
      });
      const nextOptions = normalizeAccountancyBodyNameOptions(response);
      if (!nextOptions.length) {
        throw new Error(
          emptyErrorMessage || 'Accountancy body options were not returned from Salesforce.'
        );
      }
      setOptions(nextOptions);
      loadedRef.current = true;
    } catch (err) {
      if (err?.code === 'SALESFORCE_SOCIAL_TOKEN_EXPIRED') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not load accountancy body options.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [enabled, emptyErrorMessage]);

  const retry = useCallback(() => {
    loadedRef.current = false;
    loadingRef.current = false;
    load();
  }, [load]);

  return {
    options,
    loading,
    error,
    load,
    retry,
  };
}
