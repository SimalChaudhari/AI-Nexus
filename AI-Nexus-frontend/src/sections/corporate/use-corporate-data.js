import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'src/routes/hooks';

import {
  getCorporateCertificates,
  getCorporateLearners,
  getCorporateOverview,
} from 'src/services/corporate.service';

// ----------------------------------------------------------------------

export function useCorporateCompanyCode() {
  const searchParams = useSearchParams();
  return String(searchParams.get('companyCode') || '').trim();
}

export function useCorporateOverview() {
  const companyCode = useCorporateCompanyCode();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCorporateOverview(companyCode || undefined);
      setData(result || null);
    } catch (err) {
      setData(null);
      setError(err?.message || 'Failed to load corporate overview');
    } finally {
      setLoading(false);
    }
  }, [companyCode]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, companyCode: data?.companyCode || companyCode };
}

export function useCorporateLearners({ q = '', status = 'All statuses' } = {}) {
  const companyCode = useCorporateCompanyCode();
  const [data, setData] = useState([]);
  const [resolvedCompanyCode, setResolvedCompanyCode] = useState(companyCode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCorporateLearners({
        companyCode: companyCode || undefined,
        q: q || undefined,
        status: status && status !== 'All statuses' ? status : undefined,
        limit: 100,
      });
      setData(Array.isArray(result?.data) ? result.data : []);
      setResolvedCompanyCode(result?.companyCode || companyCode);
    } catch (err) {
      setData([]);
      setError(err?.message || 'Failed to load learners');
    } finally {
      setLoading(false);
    }
  }, [companyCode, q, status]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, companyCode: resolvedCompanyCode };
}

export function useCorporateCertificates() {
  const companyCode = useCorporateCompanyCode();
  const [data, setData] = useState([]);
  const [resolvedCompanyCode, setResolvedCompanyCode] = useState(companyCode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCorporateCertificates(companyCode || undefined);
      setData(Array.isArray(result?.data) ? result.data : []);
      setResolvedCompanyCode(result?.companyCode || companyCode);
    } catch (err) {
      setData([]);
      setError(err?.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [companyCode]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, companyCode: resolvedCompanyCode };
}
