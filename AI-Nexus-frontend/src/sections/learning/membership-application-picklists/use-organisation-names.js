import { useCallback, useRef, useState } from 'react';

import { fetchOrganisationNameOptions } from 'src/api/membership-application';
import { ensureMembershipSalesforceSession } from 'src/utils/membership-salesforce-auth';

import { normalizeOrganisationNameOptions } from './utils';

// ----------------------------------------------------------------------

export function useMembershipOrganisationNames({ enabled, emptyErrorMessage }) {
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
      const response = await fetchOrganisationNameOptions({
        socialAccessToken: session.socialToken,
      });
      const nextOptions = normalizeOrganisationNameOptions(response);
      if (!nextOptions.length) {
        throw new Error(
          emptyErrorMessage || 'Organisation name options were not returned from Salesforce.'
        );
      }
      setOptions(nextOptions);
      loadedRef.current = true;
    } catch (err) {
      if (err?.code === 'SALESFORCE_SOCIAL_TOKEN_EXPIRED') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not load organisation name options.');
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
