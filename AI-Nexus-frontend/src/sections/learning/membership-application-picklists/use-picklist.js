import { useCallback, useRef, useState } from 'react';

import { fetchMembershipPicklistOptions } from 'src/api/membership-application';
import { ensureMembershipSalesforceSession } from 'src/utils/membership-salesforce-auth';

import { normalizeMembershipPicklistOptions } from './utils';

// ----------------------------------------------------------------------

export function useMembershipPicklist({ enabled, picklistKey, emptyErrorMessage }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (!enabled || !picklistKey || loadedRef.current || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const session = ensureMembershipSalesforceSession();
      const response = await fetchMembershipPicklistOptions({
        socialAccessToken: session.socialToken,
        picklistKey,
      });
      const nextOptions = normalizeMembershipPicklistOptions(response);
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
  }, [enabled, emptyErrorMessage, picklistKey]);

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

/** @deprecated Use useMembershipPicklist */
export const useMembershipEmploymentPicklist = useMembershipPicklist;
