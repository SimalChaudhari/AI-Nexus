import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';

import { exportCorporateLearnersCsv } from 'src/services/corporate.service';
import { useAuthContext } from 'src/auth/hooks';

import { CORP } from '../corporate-theme';
import { useCorporateLearners } from '../use-corporate-data';
import {
  CorpBtn,
  CorpCard,
  CorpCertificateDownloadBtn,
  CorpPageHeader,
  CorpPill,
  CorpProgressBar,
  CorpTableHead,
  CorpTextBtn,
  corpTableSx,
} from '../corporate-ui';

// ----------------------------------------------------------------------

const PAGE_SIZE = 5;

function readParam(params, key, fallback = '') {
  return String(params.get(key) || fallback);
}

export function CorporateProgressView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthContext();
  const isCorporate = String(user?.role || '').toLowerCase() === 'corporate';

  const page = Math.max(1, Number(readParam(searchParams, 'page', '1')) || 1);
  const status = readParam(searchParams, 'status', 'All statuses') || 'All statuses';
  const qParam = readParam(searchParams, 'q', '');

  const [searchInput, setSearchInput] = useState(qParam);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  // Debounce search → URL param (backend `q`)
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

  const { data: rows, pagination, loading, error, companyCode } = useCorporateLearners({
    q: qParam,
    status,
    page,
    limit: PAGE_SIZE,
  });

  const updateParams = useCallback(
    (patch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([key, value]) => {
            if (value == null || value === '' || (key === 'status' && value === 'All statuses')) {
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

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      bgcolor: 'white',
      '& fieldset': { borderColor: CORP.line },
    },
    minWidth: { xs: '100%', sm: 220 },
  };

  const exportCsv = useCallback(async () => {
    setExportError('');
    setExporting(true);
    try {
      await exportCorporateLearnersCsv({
        companyCode: isCorporate ? undefined : companyCode || undefined,
        q: qParam || undefined,
        status: status !== 'All statuses' ? status : undefined,
      });
    } catch (err) {
      console.error('CSV export failed:', err);
      setExportError(err?.message || 'CSV export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [companyCode, isCorporate, qParam, status]);

  const pageLabel = useMemo(() => {
    const total = pagination.totalItems || 0;
    if (!total) return '0 learners';
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, total);
    return `${start}–${end} of ${total}`;
  }, [pagination]);

  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <Box>
      <CorpPageHeader
        eyebrow="Learner Progress"
        title="Track completion rate by staff and by pillar"
        subtitle="Each learner row shows exact hours completed, assessment status and the pending item required to meet AI Fluency completion criteria."
        titleSx={{ fontSize: { xs: 24, md: 32 } }}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {exportError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {exportError}
        </Alert>
      ) : null}

      <CorpCard>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1.5,
            alignItems: 'center',
            mb: 1.75,
            flexWrap: 'wrap',
          }}
        >
          <TextField
            size="small"
            placeholder="Search learner, department"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={fieldSx}
            InputProps={{
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchInput('');
                      updateParams({ q: '', page: 1 });
                    }}
                    edge="end"
                  >
                    <Iconify icon="mingcute:close-line" width={18} sx={{ color: CORP.muted }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <TextField
            select
            size="small"
            value={status}
            onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
            sx={fieldSx}
          >
            {['All statuses', 'Completed', 'In Progress', 'At Risk'].map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
          <CorpBtn variant="blue" onClick={exportCsv} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </CorpBtn>
        </Box>

        <Box sx={{ overflow: 'auto' }}>
          <Box component="table" sx={corpTableSx(1320)}>
            <CorpTableHead
              columns={[
                'Learner',
                'Eligibility',
                'Pillar 1 Foundations',
                'Pillar 2 Specialisation',
                'Pillar 3 Leadership',
                'Completion status',
                'Pending item',
                'Actions',
                'Certificate',
              ]}
            />
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9}>{loading ? 'Loading...' : 'No learners found.'}</td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.userId || s.email}>
                    <td>
                      <b>{s.name}</b>
                      <small>
                        {s.email}
                        <br />
                        {s.department} - {s.role}
                      </small>
                    </td>
                    <td>
                      {s.eligibility}
                      <small>Profession: {s.profession}</small>
                    </td>
                    <td>
                      <CorpProgressBar pillar={s.p1} textType="long" />
                      <small>
                        Quiz: {s.p1?.q ? 'Passed' : 'Pending'} - Assessment:{' '}
                        {s.p1?.a ? 'Passed' : 'Pending'}
                      </small>
                    </td>
                    <td>
                      <CorpProgressBar pillar={s.p2} textType="long" />
                      <small>Eligible specialisation: {s.p2?.e ? 'Completed' : 'Pending'}</small>
                    </td>
                    <td>
                      <CorpProgressBar pillar={s.p3} textType="long" />
                    </td>
                    <td>
                      <CorpPill status={s.status} />
                      <small>Last active: {s.lastActive}</small>
                    </td>
                    <td>
                      <Box sx={{ maxWidth: 300, lineHeight: 1.45 }}>{s.pending}</Box>
                    </td>
                    <td>
                      <CorpTextBtn>Nudge</CorpTextBtn>
                      <CorpTextBtn>View</CorpTextBtn>
                    </td>
                    <td>
                      <CorpCertificateDownloadBtn
                        available={Boolean(s.cert)}
                        certificateId={s.certificateId}
                        learnerName={s.name}
                        unavailableNote={s.pending}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
            mt: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography sx={{ color: CORP.muted, fontSize: 13 }}>{pageLabel}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <CorpBtn
              variant="ghost"
              disabled={pagination.page <= 1 || loading}
              onClick={() => updateParams({ page: pagination.page - 1 })}
            >
              Previous
            </CorpBtn>
            <Typography sx={{ color: CORP.ink, fontSize: 13, fontWeight: 700, px: 1 }}>
              Page {pagination.page} / {pagination.totalPages}
            </Typography>
            <CorpBtn
              variant="ghost"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => updateParams({ page: pagination.page + 1 })}
            >
              Next
            </CorpBtn>
          </Box>
        </Box>
      </CorpCard>
    </Box>
  );
}
