import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { fCurrency, fNumber } from 'src/utils/format-number';

import { useAuthContext } from 'src/auth/hooks';
import {
  getDashboardStats,
  getDashboardRecentOrders,
  getDashboardTopRatedCourses,
} from 'src/services/dashboard.service';

import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';

import { AppQuickActions } from '../app-quick-actions';
import { AppNewInvoice } from '../app-new-invoice';
import { AppTopRatedCourses } from '../app-top-rated-courses';
import { AppWidgetSummary } from '../app-widget-summary';
import { AppMonthlyTrends } from '../app-monthly-trends';
import { AppCurrentDownload } from '../app-current-download';

// ----------------------------------------------------------------------

const EMPTY_SERIES = {
  labels: [],
  users: [],
  courses: [],
  orders: [],
  revenue: [],
  enrollments: [],
};

function formatTodayLabel() {
  return new Intl.DateTimeFormat('en-SG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export function OverviewAppView() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthContext();

  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topRatedCourses, setTopRatedCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getDashboardStats().catch(() => null),
      getDashboardRecentOrders().catch(() => []),
      getDashboardTopRatedCourses().catch(() => []),
    ])
      .then(([statsData, ordersData, topCourses]) => {
        if (!cancelled) {
          setStats(statsData || null);
          setRecentOrders(Array.isArray(ordersData) ? ordersData : []);
          setTopRatedCourses(Array.isArray(topCourses) ? topCourses : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats(null);
          setRecentOrders([]);
          setTopRatedCourses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user?.displayName || user?.firstname || user?.username || user?.email || 'Admin';

  const tableData = useMemo(
    () =>
      recentOrders.map((o) => ({
        id: o.id,
        invoiceNumber: o.orderNumber || `#${(o.id || '').slice(0, 8)}`,
        category: o.userEmail || o.userName || '—',
        price: o.totalAmount,
        date: o.createdAt,
        status: o.status || '—',
      })),
    [recentOrders]
  );

  if (loading && !stats) {
    return <LoadingScreen />;
  }

  const totalUsers = stats?.totalUsers ?? 0;
  const totalCourses = stats?.totalCourses ?? 0;
  const completedOrders = stats?.completedOrders ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const totalEnrollments = stats?.totalEnrollments ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;

  const percent = stats?.percentChange || {};
  const weekly = stats?.weeklySeries || EMPTY_SERIES;
  const monthly = stats?.monthlySeries || EMPTY_SERIES;
  const orderStatusBreakdown = Array.isArray(stats?.orderStatusBreakdown)
    ? stats.orderStatusBreakdown
    : [];

  const glanceItems = [
    {
      label: 'Total orders',
      value: fNumber(stats?.totalOrders ?? 0),
      icon: 'solar:bill-list-bold-duotone',
      color: theme.palette.info.main,
    },
    {
      label: 'Pending orders',
      value: fNumber(pendingOrders),
      icon: 'solar:clock-circle-bold-duotone',
      color: theme.palette.warning.main,
    },
    {
      label: 'Completed revenue',
      value: fCurrency(totalRevenue),
      icon: 'solar:wad-of-money-bold-duotone',
      color: theme.palette.success.main,
    },
  ];

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -0.4 }}>
              Dashboard
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
              Welcome back, {displayName}. Overview for {formatTodayLabel()}.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
            <AppQuickActions compact />
            <Button
              variant="contained"
              color="primary"
              startIcon={<Iconify icon="solar:book-bold-duotone" width={18} />}
              onClick={() => router.push(paths.admin.course.list)}
              sx={{ fontWeight: 700 }}
            >
              Manage courses
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={2.5}>
          <Grid xs={12} sm={6} md={4} lg={2.4}>
            <AppWidgetSummary
              title="Total users"
              percent={percent.users ?? 0}
              total={totalUsers}
              icon="solar:users-group-rounded-bold-duotone"
              color="primary"
              chart={{
                categories: weekly.labels,
                series: weekly.users,
              }}
            />
          </Grid>

          <Grid xs={12} sm={6} md={4} lg={2.4}>
            <AppWidgetSummary
              title="Total courses"
              percent={percent.courses ?? 0}
              total={totalCourses}
              icon="solar:book-bold-duotone"
              color="info"
              chart={{
                colors: [theme.vars.palette.info.main],
                categories: weekly.labels,
                series: weekly.courses,
              }}
            />
          </Grid>

          <Grid xs={12} sm={6} md={4} lg={2.4}>
            <AppWidgetSummary
              title="Enrollments"
              percent={percent.enrollments ?? 0}
              total={totalEnrollments}
              icon="solar:diploma-verified-bold-duotone"
              color="secondary"
              chart={{
                colors: [theme.vars.palette.secondary.main],
                categories: weekly.labels,
                series: weekly.enrollments,
              }}
            />
          </Grid>

          <Grid xs={12} sm={6} md={4} lg={2.4}>
            <AppWidgetSummary
              title="Completed orders"
              percent={percent.orders ?? 0}
              total={completedOrders}
              icon="solar:bag-check-bold-duotone"
              color="success"
              chart={{
                colors: [theme.vars.palette.success.main],
                categories: weekly.labels,
                series: weekly.orders,
              }}
            />
          </Grid>

          <Grid xs={12} sm={6} md={4} lg={2.4}>
            <AppWidgetSummary
              title="Revenue"
              percent={percent.revenue ?? 0}
              total={totalRevenue}
              format="currency"
              icon="solar:wad-of-money-bold-duotone"
              color="warning"
              chart={{
                colors: [theme.vars.palette.warning.main],
                categories: weekly.labels,
                series: weekly.revenue,
              }}
            />
          </Grid>

          <Grid xs={12} md={8}>
            <AppMonthlyTrends
              title="Platform activity"
              subheader="New users, enrollments, and completed orders · last 6 months"
              type="bar"
              chart={{
                categories: monthly.labels,
                colors: [
                  theme.vars.palette.primary.main,
                  theme.vars.palette.info.main,
                  theme.vars.palette.success.main,
                ],
                series: [
                  { name: 'Users', data: monthly.users },
                  { name: 'Enrollments', data: monthly.enrollments },
                  { name: 'Orders', data: monthly.orders },
                ],
              }}
            />
          </Grid>

          <Grid xs={12} md={4}>
            <AppCurrentDownload
              title="Order status"
              subheader={
                pendingOrders > 0
                  ? `${pendingOrders} pending review`
                  : 'Distribution of all orders'
              }
              chart={{
                colors: [
                  theme.vars.palette.success.main,
                  theme.vars.palette.warning.main,
                  theme.vars.palette.error.main,
                  theme.vars.palette.grey[500],
                  theme.vars.palette.info.main,
                ],
                series: orderStatusBreakdown,
              }}
            />
          </Grid>

          <Grid xs={12} md={8}>
            <AppMonthlyTrends
              title="Revenue trend"
              subheader="Completed order revenue (SGD) · last 6 months"
              type="area"
              emptyMessage="No completed revenue in the last 6 months yet."
              chart={{
                categories: monthly.labels,
                colors: [theme.vars.palette.warning.main],
                series: [{ name: 'Revenue', data: monthly.revenue }],
              }}
            />
          </Grid>

          <Grid xs={12} md={4} sx={{ display: 'flex' }}>
            <Card
              sx={{
                p: 2.5,
                width: 1,
                boxShadow: 'none',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  At a glance
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Key totals across the platform
                </Typography>
              </Box>

              <Stack spacing={1.5} sx={{ flex: 1 }}>
                {glanceItems.map((item) => (
                  <Stack
                    key={item.label}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: alpha(item.color, 0.06),
                      border: `1px solid ${alpha(item.color, 0.12)}`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.color,
                        bgcolor: alpha(item.color, 0.14),
                      }}
                    >
                      <Iconify icon={item.icon} width={20} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {item.label}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Grid>

          <Grid xs={12} lg={6} sx={{ display: 'flex' }}>
            <AppNewInvoice
              title="Recent orders"
              subheader="Latest completed purchases"
              tableData={tableData}
              headLabel={[
                { id: 'invoiceNumber', label: 'Order' },
                { id: 'category', label: 'Customer' },
                { id: 'price', label: 'Amount' },
                { id: 'date', label: 'Date' },
                { id: 'status', label: 'Status' },
              ]}
              onViewAll={() => router.push(paths.admin.order.list)}
              sx={{
                width: 1,
                boxShadow: 'none',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
              }}
            />
          </Grid>

          <Grid xs={12} lg={6} sx={{ display: 'flex' }}>
            <AppTopRatedCourses
              title="Top rated courses"
              subheader="Highest learner review scores"
              list={topRatedCourses}
              sx={{
                width: 1,
                boxShadow: 'none',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
              }}
            />
          </Grid>
        </Grid>
      </Stack>
    </DashboardContent>
  );
}
