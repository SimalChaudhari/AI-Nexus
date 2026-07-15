import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';

import { getCorporateNudgeEmailLogs } from 'src/services/corporate.service';
import { useAuthContext } from 'src/auth/hooks';

import { CORP } from '../corporate-theme';
import { useCorporateCompanyCode } from '../use-corporate-data';
import {
  CorpBtn,
  CorpCard,
  CorpPageHeader,
  CorpPill,
  CorpTableHead,
  corpTableSx,
} from '../corporate-ui';

// ----------------------------------------------------------------------

const PAGE_SIZE = 10;

function readParam(params, key, fallback = '') {
  return String(params.get(key) || fallback);
}

function statusToneForLog(status) {
  if (status === 'sent') return 'Completed';
  if (status === 'failed') return 'At Risk';
  return 'In Progress';
}

export function CorporateNudgeTrackView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthContext();
  const isCorporate = String(user?.role || '').toLowerCase() === 'corporate';
  const companyCode = useCorporateCompanyCode();

  const page = Math.max(1, Number(readParam(searchParams, 'page', '1')) || 1);
  const status = readParam(searchParams, 'status', 'all') || 'all';
  const source = readParam(searchParams, 'source', 'all') || 'all';
  const qParam = readParam(searchParams, 'q', '');

  const [searchInput, setSearchInput] = useState(qParam);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQ = searchInput.trim();
      const currentQ = qParam.trim();
      if (nextQ === currentQ) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextQ) next.set('q', nextQ);
          else next.delete('q');
          next.set('page', '1');
          return next;
        },
        { replace: true },
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, qParam, setSearchParams]);

  const updateParams = useCallback(
    (patch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([key, value]) => {
            if (
              value == null ||
              value === '' ||
              (key === 'status' && value === 'all') ||
              (key === 'source' && value === 'all')
            ) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCorporateNudgeEmailLogs({
        companyCode: isCorporate ? undefined : companyCode || undefined,
        q: qParam || undefined,
        status: status !== 'all' ? status : undefined,
        source: source !== 'all' ? source : undefined,
        page,
        limit: PAGE_SIZE,
      });
      setRows(Array.isArray(result?.data) ? result.data : []);
      setPagination({
        page: Number(result?.pagination?.page) || page,
        limit: Number(result?.pagination?.limit) || PAGE_SIZE,
        total: Number(result?.pagination?.total) || 0,
        totalPages: Number(result?.pagination?.totalPages) || 1,
      });
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to load nudge email track';
      setError(Array.isArray(message) ? message.join(', ') : message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [companyCode, isCorporate, page, qParam, source, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalItems = Number(pagination?.total) || 0;
  const totalPages = Number(pagination?.totalPages) || 1;
  const currentPage = Number(pagination?.page) || page;
  const from = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, totalItems);
  const pageLabel =
    totalItems === 0 ? 'No emails' : `Showing ${from}–${to} of ${totalItems} emails`;

  if (loading && !rows.length && !error) return <LoadingScreen />;

  return (
    <Box>
      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
        <CorpBtn variant="ghost" component={RouterLink} href={paths.corporate.reports}>
          Back to reports
        </CorpBtn>
      </Box>
      <CorpPageHeader
        eyebrow="Nudge campaigns"
        title="Email send track"
        subtitle="Search and review every nudge email sent — who, when, and delivery status."
        titleSx={{ fontSize: { xs: 24, md: 32 } }}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <CorpCard sx={{ mb: 2.25 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' },
            gap: 1.5,
            mb: 2,
          }}
        >
          <TextField
            size="small"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, subject…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={18} />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchInput('')} edge="end">
                    <Iconify icon="mingcute:close-line" width={16} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="sent">Sent</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="skipped">Skipped</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Source"
            value={source}
            onChange={(e) => updateParams({ source: e.target.value, page: 1 })}
          >
            <MenuItem value="all">All sources</MenuItem>
            <MenuItem value="campaign">Campaign</MenuItem>
            <MenuItem value="single">Single nudge</MenuItem>
          </TextField>
        </Box>

        <Box sx={{ overflow: 'auto' }}>
          <Box component="table" sx={corpTableSx()}>
            <CorpTableHead
              columns={['Sent at', 'Learner', 'Email', 'Status', 'Source', 'Progress note']}
            />
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>{loading ? 'Loading…' : 'No nudge emails found.'}</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.sentAt ? new Date(row.sentAt).toLocaleString() : '—'}</td>
                    <td>
                      <b>{row.learnerName || '—'}</b>
                      <small>{row.subject || ''}</small>
                    </td>
                    <td>{row.toEmail || '—'}</td>
                    <td>
                      <CorpPill status={statusToneForLog(row.status)} />
                      <small style={{ display: 'block', marginTop: 4 }}>
                        {row.status}
                        {row.errorMessage ? ` — ${row.errorMessage}` : ''}
                      </small>
                    </td>
                    <td>{row.source || '—'}</td>
                    <td>{row.progressLabel || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Box>
        </Box>

        <Box
          sx={{
            mt: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography sx={{ color: CORP.muted, fontSize: 13 }}>{pageLabel}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <CorpBtn
              variant="ghost"
              disabled={currentPage <= 1 || loading}
              onClick={() => updateParams({ page: currentPage - 1 })}
            >
              Previous
            </CorpBtn>
            <CorpBtn
              variant="ghost"
              disabled={currentPage >= totalPages || loading}
              onClick={() => updateParams({ page: currentPage + 1 })}
            >
              Next
            </CorpBtn>
          </Box>
        </Box>
      </CorpCard>
    </Box>
  );
}
