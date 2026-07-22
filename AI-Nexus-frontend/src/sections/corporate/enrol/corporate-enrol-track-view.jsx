import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { TablePaginationCustom } from 'src/components/table';
import { getCorporateStaffEnrolBatches } from 'src/services/corporate.service';
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

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function CorporateEnrolTrackView() {
  const { user } = useAuthContext();
  const isCorporate = String(user?.role || '').toLowerCase() === 'corporate';
  const companyCode = useCorporateCompanyCode();

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQ = searchInput.trim();
      setQ((prev) => {
        if (prev === nextQ) return prev;
        setPage(0);
        return nextQ;
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCorporateStaffEnrolBatches({
        companyCode: isCorporate ? undefined : companyCode || undefined,
        page: page + 1,
        limit: rowsPerPage,
        q: q || undefined,
      });
      setRows(Array.isArray(result?.data) ? result.data : []);
      setTotalItems(Number(result?.pagination?.total) || 0);
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to load enrolment track';
      setError(Array.isArray(message) ? message.join(', ') : message);
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [companyCode, isCorporate, page, q, rowsPerPage]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !rows.length && !error) return <LoadingScreen />;

  return (
    <Box>
      <Box sx={{ mb: 1.5, display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <CorpBtn variant="ghost" component={RouterLink} href={paths.corporate.enrol}>
          Back to enrol
        </CorpBtn>
        <CorpBtn variant="ghost" component={RouterLink} href={paths.corporate.bulkUploads}>
          ZIP uploads
        </CorpBtn>
      </Box>

      <CorpPageHeader
        eyebrow="Staff Enrolment"
        title="Enrolment track"
        subtitle="Search and paginate every upload/single enrol batch — passed vs skipped counts."
        titleSx={{ fontSize: { xs: 24, md: 32 } }}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <CorpCard sx={{ overflow: 'hidden' }}>
        <Box sx={{ mb: 2, maxWidth: 420 }}>
          <TextField
            size="small"
            fullWidth
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search file name, message, source, batch id…"
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
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={corpTableSx()}>
            <CorpTableHead
              columns={[
                'When',
                'Source',
                'File',
                'Sent',
                'Passed',
                'Skipped',
                'Status',
                '',
              ]}
            />
            <Box component="tbody">
              {!rows.length ? (
                <Box component="tr">
                  <Box component="td" colSpan={8} sx={{ py: 3, color: CORP.muted }}>
                    {q
                      ? 'No batches match your search.'
                      : 'No enrolment batches yet. Upload a CSV or enrol a learner to see track records here.'}
                  </Box>
                </Box>
              ) : (
                rows.map((row) => {
                  const skipped = Number(row.skippedCount) || 0;
                  const passed = Number(row.passedCount) || 0;
                  const tone =
                    skipped > 0 && passed === 0
                      ? 'At Risk'
                      : skipped > 0
                        ? 'In Progress'
                        : 'Completed';
                  return (
                    <Box component="tr" key={row.id}>
                      <Box component="td">{formatDate(row.createdAt)}</Box>
                      <Box component="td" sx={{ textTransform: 'uppercase', fontSize: 12 }}>
                        {row.source || '—'}
                      </Box>
                      <Box component="td" sx={{ maxWidth: 220, wordBreak: 'break-word' }}>
                        {row.fileName || (row.source === 'single' ? 'Single enrol' : '—')}
                      </Box>
                      <Box component="td">{Number(row.totalReceived) || 0}</Box>
                      <Box component="td">{passed}</Box>
                      <Box component="td">{skipped}</Box>
                      <Box component="td">
                        <CorpPill status={tone}>
                          {passed} passed · {skipped} skipped
                        </CorpPill>
                      </Box>
                      <Box component="td">
                        <CorpBtn
                          variant="ghost"
                          component={RouterLink}
                          href={paths.corporate.enrolTrackBatch(row.id)}
                        >
                          View rows
                        </CorpBtn>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>

        <TablePaginationCustom
          count={totalItems}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_e, next) => setPage(next)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value) || 10);
            setPage(0);
          }}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        />
      </CorpCard>
    </Box>
  );
}
