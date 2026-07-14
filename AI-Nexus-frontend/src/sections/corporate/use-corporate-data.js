import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'src/routes/hooks';
import { useAuthContext } from 'src/auth/hooks';

import {
  getCorporateCertificates,
  getCorporateLearners,
  getCorporateOverview,
} from 'src/services/corporate.service';

// ----------------------------------------------------------------------

/** Admin may pass ?companyCode=; Corporate users use JWT companyCode on the API. */
export function useCorporateCompanyCode() {
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const role = String(user?.role || '').toLowerCase();
  if (role === 'corporate') {
    return String(user?.companyCode || '').trim();
  }
  return String(searchParams.get('companyCode') || '').trim();
}

export function useCorporateOverview() {
  const companyCode = useCorporateCompanyCode();
  const { user } = useAuthContext();
  const isCorporate = String(user?.role || '').toLowerCase() === 'corporate';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCorporateOverview(isCorporate ? undefined : companyCode || undefined);
      setData(result || null);
    } catch (err) {
      setData(null);
      setError(err?.message || 'Failed to load corporate overview');
    } finally {
      setLoading(false);
    }
  }, [companyCode, isCorporate]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, companyCode: data?.companyCode || companyCode };
}

export function useCorporateLearners({
  q = '',
  status = 'All statuses',
  page = 1,
  limit = 5,
} = {}) {
  const companyCode = useCorporateCompanyCode();
  const { user } = useAuthContext();
  const isCorporate = String(user?.role || '').toLowerCase() === 'corporate';
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    totalItems: 0,
    totalPages: 1,
  });
  const [resolvedCompanyCode, setResolvedCompanyCode] = useState(companyCode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCorporateLearners({
        companyCode: isCorporate ? undefined : companyCode || undefined,
        q: q || undefined,
        status: status && status !== 'All statuses' ? status : undefined,
        page,
        limit,
      });
      setData(Array.isArray(result?.data) ? result.data : []);
      setPagination({
        page: Number(result?.pagination?.page) || page,
        limit: Number(result?.pagination?.limit) || limit,
        totalItems: Number(result?.pagination?.totalItems) || 0,
        totalPages: Number(result?.pagination?.totalPages) || 1,
      });
      setResolvedCompanyCode(result?.companyCode || companyCode);
    } catch (err) {
      setData([]);
      setPagination({ page: 1, limit, totalItems: 0, totalPages: 1 });
      setError(err?.message || 'Failed to load learners');
    } finally {
      setLoading(false);
    }
  }, [companyCode, isCorporate, q, status, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    pagination,
    loading,
    error,
    reload: load,
    companyCode: resolvedCompanyCode,
  };
}

export function useCorporateCertificates() {
  const companyCode = useCorporateCompanyCode();
  const { user } = useAuthContext();
  const isCorporate = String(user?.role || '').toLowerCase() === 'corporate';
  const [data, setData] = useState([]);
  const [resolvedCompanyCode, setResolvedCompanyCode] = useState(companyCode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCorporateCertificates(isCorporate ? undefined : companyCode || undefined);
      setData(Array.isArray(result?.data) ? result.data : []);
      setResolvedCompanyCode(result?.companyCode || companyCode);
    } catch (err) {
      setData([]);
      setError(err?.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [companyCode, isCorporate]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, companyCode: resolvedCompanyCode };
}
