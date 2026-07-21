import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

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
import { TablePaginationCustom } from 'src/components/table';
import { getCorporateStaffEnrolBatch } from 'src/services/corporate.service';
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

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50, 100];

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function CorporateEnrolTrackDetailView() {
  const { batchId } = useParams();
  const { user } = useAuthContext();
  const isCorporate = String(user?.role || '').toLowerCase() === 'corporate';
  const companyCode = useCorporateCompanyCode();

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

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
      const result = await getCorporateStaffEnrolBatch(batchId, {
        companyCode: isCorporate ? undefined : companyCode || undefined,
        page: page + 1,
        limit: rowsPerPage,
        q: q || undefined,
        status: statusFilter,
      });
      setData(result || null);
      setRows(Array.isArray(result?.rows) ? result.rows : []);
      setTotalItems(Number(result?.pagination?.total) || 0);
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to load enrolment batch';
      setError(Array.isArray(message) ? message.join(', ') : message);
      setData(null);
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [batchId, companyCode, isCorporate, page, q, rowsPerPage, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data && !error) return <LoadingScreen />;

  return (
    <Box>
      <Box sx={{ mb: 1.5, display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <CorpBtn variant="ghost" component={RouterLink} href={paths.corporate.enrolTrack}>
          Back to track list
        </CorpBtn>
        <CorpBtn variant="ghost" component={RouterLink} href={paths.corporate.enrol}>
          Enrol staff
        </CorpBtn>
      </Box>

      <CorpPageHeader
        eyebrow="Staff Enrolment"
        title="Batch row track"
        subtitle={
          data
            ? `${data.fileName || (data.source === 'single' ? 'Single enrol' : 'CSV batch')} · ${formatDate(data.createdAt)}`
            : 'Row-level pass / skip reasons for this enrolment batch.'
        }
        titleSx={{ fontSize: { xs: 24, md: 32 } }}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {data ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 1.25,
            mb: 2,
          }}
        >
          {[
            { label: 'Sent', value: data.totalReceived },
            { label: 'Passed', value: data.passedCount },
            { label: 'Skipped', value: data.skippedCount },
            { label: 'Source', value: String(data.source || '—').toUpperCase() },
          ].map((card) => (
            <CorpCard key={card.label} sx={{ p: 1.75 }}>
              <Typography sx={{ color: CORP.muted, fontSize: 12, fontWeight: 700 }}>
                {card.label}
              </Typography>
              <Typography sx={{ color: CORP.navy, fontWeight: 800, fontSize: 22, mt: 0.5 }}>
                {card.value}
              </Typography>
            </CorpCard>
          ))}
        </Box>
      ) : null}

      <CorpCard sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) 180px' },
            gap: 1.5,
            mb: 2,
          }}
        >
          <TextField
            size="small"
            fullWidth
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, step, reason…"
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
            fullWidth
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="all">All rows</MenuItem>
            <MenuItem value="passed">Passed only</MenuItem>
            <MenuItem value="skipped">Skipped only</MenuItem>
          </TextField>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={corpTableSx()}>
            <CorpTableHead columns={['Name', 'Email', 'Status', 'Step', 'Reason']} />
            <Box component="tbody">
              {!rows.length ? (
                <Box component="tr">
                  <Box component="td" colSpan={5} sx={{ py: 3, color: CORP.muted }}>
                    {q || statusFilter !== 'all'
                      ? 'No rows match your search/filter.'
                      : 'No rows in this batch.'}
                  </Box>
                </Box>
              ) : (
                rows.map((row, index) => (
                  <Box component="tr" key={`${row.email}-${page}-${index}`}>
                    <Box component="td">{row.name || '—'}</Box>
                    <Box component="td" sx={{ wordBreak: 'break-all' }}>
                      {row.email || '—'}
                    </Box>
                    <Box component="td">
                      <CorpPill status={row.status === 'passed' ? 'Completed' : 'At Risk'}>
                        {row.status === 'passed' ? 'Passed' : 'Skipped'}
                      </CorpPill>
                    </Box>
                    <Box component="td">{row.step || '—'}</Box>
                    <Box component="td" sx={{ maxWidth: 360, wordBreak: 'break-word' }}>
                      {row.reason || (row.status === 'passed' ? '—' : 'Skipped')}
                    </Box>
                  </Box>
                ))
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
