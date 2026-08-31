import { useCallback, useRef, useState } from 'react';

import { fetchEmploymentPicklistOptions } from 'src/api/membership-application';
import { ensureMembershipSalesforceSession } from 'src/utils/membership-salesforce-auth';

import { normalizeEmploymentPicklistOptions } from './utils';

// ----------------------------------------------------------------------

export function useMembershipEmploymentPicklist({ enabled, field, emptyErrorMessage }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (!enabled || !field || loadedRef.current || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const session = ensureMembershipSalesforceSession();
      const response = await fetchEmploymentPicklistOptions({
        socialAccessToken: session.socialToken,
        field,
      });
      const nextOptions = normalizeEmploymentPicklistOptions(response);
      if (!nextOptions.length) {
        throw new Error(emptyErrorMessage || 'Picklist options were not returned from Salesforce.');
      }
      setOptions(nextOptions);
      loadedRef.current = true;
    } catch (err) {
      if (err?.code === 'SALESFORCE_SOCIAL_TOKEN_EXPIRED') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not load picklist options.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [enabled, emptyErrorMessage, field]);

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
