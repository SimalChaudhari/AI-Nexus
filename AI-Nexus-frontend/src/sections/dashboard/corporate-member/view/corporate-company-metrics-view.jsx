import { useCallback, useEffect, useMemo, useState } from 'react';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { DatePicker } from '@mui/x-date-pickers';
import { formHelperTextClasses } from '@mui/material/FormHelperText';
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';

import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { fNumber } from 'src/utils/format-number';
import { getDashboardCompanyGrowth } from 'src/services/dashboard.service';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { AppWidgetSummary } from 'src/sections/overview/app/app-widget-summary';
import { AppMonthlyTrends } from 'src/sections/overview/app/app-monthly-trends';

const EMPTY_METRIC = { total: 0, previousTotal: 0, percentChange: 0 };

const GRAIN_OPTIONS = [
  { value: 'months', label: 'Month', icon: 'solar:calendar-bold-duotone' },
  { value: 'weeks', label: 'Week', icon: 'solar:calendar-date-bold' },
];

const PERIOD_TABLE_HEAD = [
  { id: 'periodNumber', label: 'S.No', width: 88 },
  { id: 'label', label: 'Period', minWidth: 240 },
  { id: 'companiesEnrolled', label: 'Companies enrolled', align: 'right', width: 170 },
  { id: 'learnersInCompanies', label: 'Learners', align: 'right', width: 140 },
  { id: 'badgeEarners', label: 'Badge earners', align: 'right', width: 150 },
  { id: 'champions', label: 'Champions', align: 'right', width: 140 },
];

const COMPANY_TABLE_HEAD = [
  { id: 'sno', label: 'S.No', width: 80 },
  { id: 'companyName', label: 'Company', minWidth: 200 },
  { id: 'companyCode', label: 'Company code', width: 140 },
  { id: 'enrolledAt', label: 'Enrolled', width: 130 },
  { id: 'totalUsers', label: 'Total users', align: 'right', width: 120 },
  { id: 'badgePercent', label: 'Badge earners %', width: 200 },
  { id: 'championPercent', label: 'Champion users %', width: 200 },
];

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename, header, rows) {
  const lines = [header.join(','), ...rows];
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadPeriodCsv(rows, grain) {
  downloadCsv(
    `weekly-metric-2-report-${grain}.csv`,
    ['S.No', 'Period', 'From', 'To', 'Companies enrolled', 'Learners', 'Badge earners', 'Champions'],
    rows.map((row, index) =>
      [
        csvCell(index + 1),
        csvCell(row.label),
        csvCell(formatDisplayDate(row.start)),
        csvCell(formatDisplayDate(row.asOf || row.end)),
        csvCell(row.companiesEnrolled ?? 0),
        csvCell(row.learnersInCompanies ?? 0),
        csvCell(row.badgeEarners ?? 0),
        csvCell(row.champions ?? 0),
      ].join(',')
    )
  );
}

function downloadCompanyCsv(rows) {
  downloadCsv(
    'weekly-metric-2-companies.csv',
    [
      'S.No',
      'Company',
      'Company code',
      'Enrolled',
      'Total users',
      'Badge earners',
      'Badge earners %',
      'Champion users',
      'Champion users %',
    ],
    rows.map((row, index) =>
      [
        csvCell(index + 1),
        csvCell(row.companyName),
        csvCell(row.companyCode),
        csvCell(formatDisplayDate(row.enrolledAt)),
        csvCell(row.totalUsers ?? 0),
        csvCell(row.badgeEarners ?? 0),
        csvCell(row.badgePercent ?? 0),
        csvCell(row.champions ?? 0),
        csvCell(row.championPercent ?? 0),
      ].join(',')
    )
  );
}

function formatYmd(value) {
  if (!value) return undefined;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined;
}

function formatDisplayDate(value) {
  if (!value) return '—';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('D MMM YYYY') : '—';
}

function periodOverlapsRange(row, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const start = dayjs(row.start);
  const end = dayjs(row.end);
  if (!start.isValid() || !end.isValid()) return true;
  if (fromDate && end.isBefore(dayjs(fromDate).startOf('day'))) return false;
  if (toDate && start.isAfter(dayjs(toDate).endOf('day'))) return false;
  return true;
}

function calcPercentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function metricFromRows(rows, allRows, key) {
  if (!rows.length) return EMPTY_METRIC;
  const last = rows[rows.length - 1];
  const previous = allRows.find((row) => row.periodNumber === last.periodNumber - 1);
  const total = Number(last?.[key]) || 0;
  const previousTotal = Number(previous?.[key]) || 0;
  return {
    total,
    previousTotal,
    percentChange: calcPercentChange(total, previousTotal),
  };
}

function PercentCell({ value, count, total, color }) {
  const theme = useTheme();
  const palette = theme.palette[color] || theme.palette.primary;
  const percent = Number(value) || 0;

  return (
    <Stack spacing={0.75} sx={{ minWidth: 150 }}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Typography variant="subtitle2">{percent}%</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {fNumber(count || 0)} / {fNumber(total || 0)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, percent))}
        sx={{
          height: 8,
          borderRadius: 1,
          bgcolor: alpha(palette.main, 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: palette.main, borderRadius: 1 },
        }}
      />
    </Stack>
  );
}

export function CorporateCompanyMetricsView() {
  const theme = useTheme();
  const periodTable = useTable({
    defaultRowsPerPage: 5,
    defaultOrderBy: 'periodNumber',
    defaultOrder: 'asc',
  });
  const companyTable = useTable({
    defaultRowsPerPage: 5,
    defaultOrderBy: 'companyName',
    defaultOrder: 'asc',
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grain, setGrain] = useState('months');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboardCompanyGrowth()
      .then((data) => {
        if (!cancelled) setReport(data || null);
      })
      .catch(() => {
        if (!cancelled) {
          setReport(null);
          toast.error('Could not load company metrics');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dateError = Boolean(fromDate && toDate && dayjs(toDate).isBefore(dayjs(fromDate), 'day'));
  const hasDateFilter = Boolean(fromDate || toDate) && !dateError;
  const fromYmd = formatYmd(fromDate);
  const toYmd = formatYmd(toDate);

  const allPeriodRows = useMemo(() => {
    if (grain === 'weeks') return Array.isArray(report?.weeks) ? report.weeks : [];
    return Array.isArray(report?.months) ? report.months : [];
  }, [grain, report]);

  const periodRows = useMemo(() => {
    if (!hasDateFilter) return allPeriodRows;
    return allPeriodRows.filter((row) => periodOverlapsRange(row, fromDate, toDate));
  }, [allPeriodRows, fromDate, hasDateFilter, toDate]);

  const sortedPeriodRows = useMemo(
    () => [...periodRows].sort(getComparator(periodTable.order, periodTable.orderBy)),
    [periodRows, periodTable.order, periodTable.orderBy]
  );

  const pagePeriodRows = useMemo(
    () =>
      sortedPeriodRows.slice(
        periodTable.page * periodTable.rowsPerPage,
        periodTable.page * periodTable.rowsPerPage + periodTable.rowsPerPage
      ),
    [periodTable.page, periodTable.rowsPerPage, sortedPeriodRows]
  );

  const currentPeriodNumber = allPeriodRows[allPeriodRows.length - 1]?.periodNumber;
  const companiesMetric = hasDateFilter
    ? metricFromRows(periodRows, allPeriodRows, 'companiesEnrolled')
    : report?.companiesEnrolled || EMPTY_METRIC;
  const learnersMetric = hasDateFilter
    ? metricFromRows(periodRows, allPeriodRows, 'learnersInCompanies')
    : report?.learnersInCompanies || EMPTY_METRIC;

  const companies = Array.isArray(report?.companies) ? report.companies : [];

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((row) => {
      if (hasDateFilter && row.enrolledAt) {
        const enrolled = dayjs(row.enrolledAt);
        if (toDate && enrolled.isAfter(dayjs(toDate).endOf('day'))) return false;
      }
      if (!q) return true;
      const name = String(row.companyName || '').toLowerCase();
      const code = String(row.companyCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [companies, hasDateFilter, search, toDate]);

  const sortedCompanies = useMemo(
    () => [...filteredCompanies].sort(getComparator(companyTable.order, companyTable.orderBy)),
    [companyTable.order, companyTable.orderBy, filteredCompanies]
  );

  const pageCompanies = useMemo(
    () =>
      sortedCompanies.slice(
        companyTable.page * companyTable.rowsPerPage,
        companyTable.page * companyTable.rowsPerPage + companyTable.rowsPerPage
      ),
    [companyTable.page, companyTable.rowsPerPage, sortedCompanies]
  );

  const grainLabel = GRAIN_OPTIONS.find((item) => item.value === grain)?.label || 'Month';
  const trendPeriod = grain === 'weeks' ? '· vs last week' : '· vs last month';
  const periodNotFound = !loading && periodRows.length === 0;
  const companyNotFound = !loading && sortedCompanies.length === 0;

  const handleGrainChange = useCallback(
    (_event, value) => {
      if (!value) return;
      setGrain(value);
      periodTable.onResetPage();
    },
    [periodTable]
  );

  const handleFromDate = useCallback(
    (value) => {
      setFromDate(value);
      periodTable.onResetPage();
      companyTable.onResetPage();
    },
    [companyTable, periodTable]
  );

  const handleToDate = useCallback(
    (value) => {
      setToDate(value);
      periodTable.onResetPage();
      companyTable.onResetPage();
    },
    [companyTable, periodTable]
  );

  const handleClearDates = useCallback(() => {
    setFromDate(null);
    setToDate(null);
    periodTable.onResetPage();
    companyTable.onResetPage();
  }, [companyTable, periodTable]);

  const handleSearch = useCallback(
    (event) => {
      setSearch(event.target.value);
      companyTable.onResetPage();
    },
    [companyTable]
  );

  const handleExportPeriods = useCallback(() => {
    if (!periodRows.length) {
      toast.error('No totals to export');
      return;
    }
    downloadPeriodCsv(periodRows, grain);
    toast.success('Weekly report exported');
  }, [grain, periodRows]);

  const handleExportCompanies = useCallback(() => {
    if (!sortedCompanies.length) {
      toast.error('No companies to export');
      return;
    }
    downloadCompanyCsv(sortedCompanies);
    toast.success('Company report exported');
  }, [sortedCompanies]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Company Enrolment"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Corporate Members', href: paths.admin.corporateMember.root },
          { name: 'Company Enrolment' },
        ]}
        sx={{ mb: { xs: 3, md: 4 } }}
      />

      <Stack spacing={3}>
        <Grid container spacing={2.5}>
          <Grid xs={12} sm={6}>
            <AppWidgetSummary
              title="Companies enrolled"
              percent={companiesMetric.percentChange ?? 0}
              total={companiesMetric.total ?? report?.companyCount ?? 0}
              icon="solar:buildings-3-bold-duotone"
              color="primary"
              trendPeriod={trendPeriod}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <AppWidgetSummary
              title="Learners in companies"
              percent={learnersMetric.percentChange ?? 0}
              total={learnersMetric.total ?? report?.totalUsers ?? 0}
              icon="solar:users-group-rounded-bold-duotone"
              color="info"
              trendPeriod={trendPeriod}
            />
          </Grid>
        </Grid>

        <Card
          sx={{
            boxShadow: 'none',
            border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
          }}
        >
          <Stack spacing={2} sx={{ px: 3, py: 2.25 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {grainLabel} totals
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Running totals from launch. Each period shows its date range (Asia/Singapore).
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={grain}
                  onChange={handleGrainChange}
                  sx={{ flexShrink: 0 }}
                >
                  {GRAIN_OPTIONS.map((option) => (
                    <ToggleButton key={option.value} value={option.value} sx={{ px: 1.5, fontWeight: 700 }}>
                      <Iconify icon={option.icon} width={16} sx={{ mr: 0.75 }} />
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={<Iconify icon="solar:download-bold" width={18} />}
                  onClick={handleExportPeriods}
                  disabled={!periodRows.length}
                  sx={{ fontWeight: 700, height: 36 }}
                >
                  Weekly report export
                </Button>
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <DatePicker
                label="From"
                value={fromDate}
                onChange={handleFromDate}
                maxDate={toDate || undefined}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                sx={{ maxWidth: { sm: 200 } }}
              />

              <DatePicker
                label="To"
                value={toDate}
                onChange={handleToDate}
                minDate={fromDate || undefined}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    error: dateError,
                    helperText: dateError ? 'To date must be after From date' : null,
                  },
                }}
                sx={{
                  maxWidth: { sm: 200 },
                  [`& .${formHelperTextClasses.root}`]: {
                    position: { sm: 'absolute' },
                    bottom: { sm: -32 },
                  },
                }}
              />

              <Button
                color="inherit"
                disabled={!fromDate && !toDate}
                onClick={handleClearDates}
                startIcon={<Iconify icon="solar:restart-bold" width={18} />}
                sx={{ flexShrink: 0, fontWeight: 700, height: 40 }}
              >
                Clear
              </Button>
            </Stack>
          </Stack>

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table size={periodTable.dense ? 'small' : 'medium'} sx={{ minWidth: 920 }}>
                <TableHeadCustom
                  order={periodTable.order}
                  orderBy={periodTable.orderBy}
                  headLabel={PERIOD_TABLE_HEAD}
                  rowCount={periodRows.length}
                  onSort={periodTable.onSort}
                />

                <TableBody>
                  {pagePeriodRows.map((row, index) => {
                    const isCurrent = row.periodNumber === currentPeriodNumber;
                    const serialNo = periodTable.page * periodTable.rowsPerPage + index + 1;
                    return (
                      <TableRow
                        key={`${grain}-${row.periodNumber}-${row.start}`}
                        hover
                        sx={isCurrent ? { bgcolor: alpha(theme.palette.primary.main, 0.04) } : undefined}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle2">{serialNo}</Typography>
                            {isCurrent ? (
                              <Label color="primary" variant="soft">
                                Current
                              </Label>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.label}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2">{fNumber(row.companiesEnrolled || 0)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2">{fNumber(row.learnersInCompanies || 0)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2">{fNumber(row.badgeEarners || 0)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2">{fNumber(row.champions || 0)}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  <TableEmptyRows
                    height={periodTable.dense ? 52 : 72}
                    emptyRows={emptyRows(periodTable.page, periodTable.rowsPerPage, periodRows.length)}
                  />

                  <TableNoData notFound={periodNotFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          <TablePaginationCustom
            page={periodTable.page}
            dense={periodTable.dense}
            count={periodRows.length}
            rowsPerPage={periodTable.rowsPerPage}
            onPageChange={periodTable.onChangePage}
            onChangeDense={periodTable.onChangeDense}
            onRowsPerPageChange={periodTable.onChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Card>

        <AppMonthlyTrends
          title={`${grainLabel}-on-${grainLabel.toLowerCase()} company enrolment`}
          subheader={
            hasDateFilter
              ? `Filtered ${fromYmd || 'launch'} to ${toYmd || 'today'} (Asia/Singapore)`
              : 'Cumulative totals from launch to date (Asia/Singapore)'
          }
          type="area"
          emptyMessage="No company enrolment data yet."
          chart={{
            categories: periodRows.map((row) => (grain === 'weeks' ? `W${row.periodNumber}` : row.label)),
            colors: [
              theme.palette.primary.main,
              theme.palette.info.main,
              theme.palette.warning.main,
              theme.palette.success.main,
            ],
            series: [
              { name: 'Companies enrolled', data: periodRows.map((row) => Number(row.companiesEnrolled) || 0) },
              { name: 'Learners', data: periodRows.map((row) => Number(row.learnersInCompanies) || 0) },
              { name: 'Badge earners', data: periodRows.map((row) => Number(row.badgeEarners) || 0) },
              { name: 'Champions', data: periodRows.map((row) => Number(row.champions) || 0) },
            ],
          }}
        />

        <Card
          sx={{
            boxShadow: 'none',
            border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
            sx={{ px: 3, py: 2.25 }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Enrolled companies
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Only companies from Corporate Members. Badge % is digital badge earners in that
                company. Champion % is users who completed 30 CPE hours or more.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
              <TextField
                size="small"
                value={search}
                onChange={handleSearch}
                placeholder="Search company..."
                sx={{ width: { xs: 1, sm: 240 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" width={18} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<Iconify icon="solar:download-bold" width={18} />}
                onClick={handleExportCompanies}
                disabled={!sortedCompanies.length}
                sx={{ fontWeight: 700, height: 36, flexShrink: 0 }}
              >
                Export companies
              </Button>
            </Stack>
          </Stack>

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table size={companyTable.dense ? 'small' : 'medium'} sx={{ minWidth: 1080 }}>
                <TableHeadCustom
                  order={companyTable.order}
                  orderBy={companyTable.orderBy}
                  headLabel={COMPANY_TABLE_HEAD}
                  rowCount={sortedCompanies.length}
                  onSort={companyTable.onSort}
                />

                <TableBody>
                  {pageCompanies.map((row, index) => {
                    const serialNo = companyTable.page * companyTable.rowsPerPage + index + 1;
                    return (
                      <TableRow key={row.companyCode} hover>
                        <TableCell>
                          <Typography variant="subtitle2">{serialNo}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">{row.companyName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {row.companyCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDisplayDate(row.enrolledAt)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2">{fNumber(row.totalUsers || 0)}</Typography>
                        </TableCell>
                        <TableCell>
                          <PercentCell
                            value={row.badgePercent}
                            count={row.badgeEarners}
                            total={row.totalUsers}
                            color="warning"
                          />
                        </TableCell>
                        <TableCell>
                          <PercentCell
                            value={row.championPercent}
                            count={row.champions}
                            total={row.totalUsers}
                            color="success"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  <TableEmptyRows
                    height={companyTable.dense ? 64 : 84}
                    emptyRows={emptyRows(companyTable.page, companyTable.rowsPerPage, sortedCompanies.length)}
                  />

                  <TableNoData notFound={companyNotFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          <TablePaginationCustom
            page={companyTable.page}
            dense={companyTable.dense}
            count={sortedCompanies.length}
            rowsPerPage={companyTable.rowsPerPage}
            onPageChange={companyTable.onChangePage}
            onChangeDense={companyTable.onChangeDense}
            onRowsPerPageChange={companyTable.onChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Card>
      </Stack>
    </DashboardContent>
  );
}
