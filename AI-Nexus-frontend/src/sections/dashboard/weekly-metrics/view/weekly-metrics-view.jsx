import { useMemo, useState, useEffect, useCallback } from 'react';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import TableContainer from '@mui/material/TableContainer';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { formHelperTextClasses } from '@mui/material/FormHelperText';
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';

import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { fNumber } from 'src/utils/format-number';
import { getDashboardOverallGrowthWeekly } from 'src/services/dashboard.service';

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

import { WeeklyMetricsExportDialog } from '../weekly-metrics-export-dialog';

const EMPTY_METRIC = { total: 0, previousTotal: 0, percentChange: 0 };

const GRAIN_OPTIONS = [
  { value: 'months', label: 'Month', icon: 'solar:calendar-bold-duotone' },
  { value: 'weeks', label: 'Week', icon: 'solar:calendar-date-bold' },
];

const TABLE_HEAD = [
  { id: 'periodNumber', label: 'S.No', width: 88 },
  { id: 'label', label: 'Period', minWidth: 220 },
  { id: 'enrolledUsers', label: 'Total enrolled', align: 'right', width: 150 },
  { id: 'fluencyEarners', label: 'Total fluency', align: 'right', width: 150 },
  { id: 'badgeEarners', label: 'Total badges', align: 'right', width: 150 },
  { id: 'champions', label: 'Total champions', align: 'right', width: 160 },
];

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadTotalsCsv(rows, grain) {
  const header = [
    'S.No',
    'Period',
    'Total enrolled',
    'Total fluency',
    'Total badges',
    'Total champions',
  ];
  const lines = [
    header.join(','),
    ...rows.map((row, index) =>
      [
        csvCell(index + 1),
        csvCell(row.label),
        csvCell(row.enrolledUsers ?? 0),
        csvCell(row.fluencyEarners ?? 0),
        csvCell(row.badgeEarners ?? 0),
        csvCell(row.champions ?? 0),
      ].join(',')
    ),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `weekly-report-export-${grain}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatYmd(value) {
  if (!value) return undefined;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined;
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

export function WeeklyMetricsView() {
  const theme = useTheme();
  const table = useTable({ defaultRowsPerPage: 5, defaultOrderBy: 'periodNumber', defaultOrder: 'asc' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grain, setGrain] = useState('months');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboardOverallGrowthWeekly()
      .then((data) => {
        if (!cancelled) setReport(data || null);
      })
      .catch(() => {
        if (!cancelled) {
          setReport(null);
          toast.error('Could not load weekly metrics');
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

  const allRows = useMemo(() => {
    if (grain === 'weeks') return Array.isArray(report?.weeks) ? report.weeks : [];
    return Array.isArray(report?.months) ? report.months : [];
  }, [grain, report]);

  const rows = useMemo(() => {
    if (!hasDateFilter) return allRows;
    return allRows.filter((row) => periodOverlapsRange(row, fromDate, toDate));
  }, [allRows, fromDate, hasDateFilter, toDate]);

  const sortedRows = useMemo(
    () => [...rows].sort(getComparator(table.order, table.orderBy)),
    [rows, table.order, table.orderBy]
  );

  const currentPeriodNumber = allRows[allRows.length - 1]?.periodNumber;

  const enrolled = hasDateFilter
    ? metricFromRows(rows, allRows, 'enrolledUsers')
    : report?.enrolledUsers || EMPTY_METRIC;
  const fluency = hasDateFilter
    ? metricFromRows(rows, allRows, 'fluencyEarners')
    : report?.fluencyEarners || EMPTY_METRIC;
  const badges = hasDateFilter
    ? metricFromRows(rows, allRows, 'badgeEarners')
    : report?.badgeEarners || EMPTY_METRIC;
  const champions = hasDateFilter
    ? metricFromRows(rows, allRows, 'champions')
    : report?.champions || EMPTY_METRIC;

  const pageRows = useMemo(
    () =>
      sortedRows.slice(table.page * table.rowsPerPage, table.page * table.rowsPerPage + table.rowsPerPage),
    [sortedRows, table.page, table.rowsPerPage]
  );

  const chartCategories = rows.map((row) =>
    grain === 'weeks' ? `W${row.periodNumber}` : row.label
  );
  const notFound = !loading && rows.length === 0;
  const grainLabel = GRAIN_OPTIONS.find((item) => item.value === grain)?.label || 'Month';
  const trendPeriod = grain === 'weeks' ? '· vs last week' : '· vs last month';

  const handleGrainChange = useCallback(
    (_event, value) => {
      if (!value) return;
      setGrain(value);
      table.onResetPage();
    },
    [table]
  );

  const handleFromDate = useCallback(
    (value) => {
      setFromDate(value);
      table.onResetPage();
    },
    [table]
  );

  const handleToDate = useCallback(
    (value) => {
      setToDate(value);
      table.onResetPage();
    },
    [table]
  );

  const handleClearDates = useCallback(() => {
    setFromDate(null);
    setToDate(null);
    table.onResetPage();
  }, [table]);

  const handleExportTotals = useCallback(() => {
    if (!rows.length) {
      toast.error('No totals to export');
      return;
    }
    downloadTotalsCsv(rows, grain);
    toast.success('Weekly report exported');
  }, [grain, rows]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Weekly Metric No. 1 — Overall Growth"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Weekly Metrics' },
        ]}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="solar:users-group-rounded-bold" width={18} />}
            onClick={() => setExportOpen(true)}
            sx={{ fontWeight: 700 }}
          >
            Export users
          </Button>
        }
        sx={{ mb: { xs: 3, md: 4 } }}
      />

      <Stack spacing={3}>
        <Grid container spacing={2.5}>
          <Grid xs={12} sm={6} md={3}>
            <AppWidgetSummary
              title="Total Enrolled Users"
              percent={enrolled.percentChange ?? 0}
              total={enrolled.total ?? 0}
              icon="solar:users-group-rounded-bold-duotone"
              color="primary"
              trendPeriod={trendPeriod}
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <AppWidgetSummary
              title="Total Fluency"
              percent={fluency.percentChange ?? 0}
              total={fluency.total ?? 0}
              icon="solar:book-bookmark-bold-duotone"
              color="info"
              tag="Certificate"
              trendPeriod={trendPeriod}
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <AppWidgetSummary
              title="Total Digital Badge Earners"
              percent={badges.percentChange ?? 0}
              total={badges.total ?? 0}
              icon="solar:medal-ribbons-star-bold-duotone"
              color="warning"
              trendPeriod={trendPeriod}
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <AppWidgetSummary
              title="Total Champions"
              percent={champions.percentChange ?? 0}
              total={champions.total ?? 0}
              icon="solar:cup-star-bold-duotone"
              color="success"
              tag="Certificate"
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
                  Running totals from launch. Latest row is the current period to date.
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
                  onClick={handleExportTotals}
                  disabled={!rows.length}
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
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 860 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={rows.length}
                  onSort={table.onSort}
                />

                <TableBody>
                  {pageRows.map((row, index) => {
                    const isCurrent = row.periodNumber === currentPeriodNumber;
                    const serialNo = table.page * table.rowsPerPage + index + 1;
                    return (
                      <TableRow
                        key={`${grain}-${row.periodNumber}-${row.start}`}
                        hover
                        sx={
                          isCurrent
                            ? { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                            : undefined
                        }
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle2">
                              {serialNo}
                            </Typography>
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
                          <Typography variant="subtitle2">{fNumber(row.enrolledUsers || 0)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2">{fNumber(row.fluencyEarners || 0)}</Typography>
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
                    height={table.dense ? 52 : 72}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, rows.length)}
                  />

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={rows.length}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Card>

        <AppMonthlyTrends
          title={`${grainLabel}-on-${grainLabel.toLowerCase()} growth`}
          subheader={
            hasDateFilter
              ? `Filtered ${fromYmd || 'launch'} to ${toYmd || 'today'} (Asia/Singapore)`
              : 'Cumulative totals from launch to date (Asia/Singapore)'
          }
          type="area"
          emptyMessage="No growth data yet."
          chart={{
            categories: chartCategories,
            colors: [
              theme.palette.primary.main,
              theme.palette.info.main,
              theme.palette.warning.main,
              theme.palette.success.main,
            ],
            series: [
              { name: 'Enrolled users', data: rows.map((row) => Number(row.enrolledUsers) || 0) },
              { name: 'Fluency', data: rows.map((row) => Number(row.fluencyEarners) || 0) },
              { name: 'Badge earners', data: rows.map((row) => Number(row.badgeEarners) || 0) },
              { name: 'Champions', data: rows.map((row) => Number(row.champions) || 0) },
            ],
          }}
        />
      </Stack>

      <WeeklyMetricsExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        from={hasDateFilter ? fromYmd : undefined}
        to={hasDateFilter ? toYmd : undefined}
      />
    </DashboardContent>
  );
}
