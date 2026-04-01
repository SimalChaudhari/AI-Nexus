import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { SeoIllustration } from 'src/assets/illustrations';
import { _appFeatured } from 'src/_mock';

import { useAuthContext } from 'src/auth/hooks';
import { getDashboardStats, getDashboardRecentOrders, getDashboardTopRatedCourses } from 'src/services/dashboard.service';

import { LoadingScreen } from 'src/components/loading-screen';

import { AppWelcome } from '../app-welcome';
import { AppFeatured } from '../app-featured';
import { AppNewInvoice } from '../app-new-invoice';
import { AppTopRatedCourses } from '../app-top-rated-courses';
import { AppWidgetSummary } from '../app-widget-summary';

// ----------------------------------------------------------------------

const CHART_CATEGORIES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

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
    Promise.all([getDashboardStats(), getDashboardRecentOrders(), getDashboardTopRatedCourses()])
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
    return () => { cancelled = true; };
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
  const totalOrders = stats?.completedOrders ?? stats?.totalOrders ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <AppWelcome
            title={`Welcome back 👋 \n ${displayName}`}
            description="Manage courses, orders, and users from your admin dashboard."
            img={<SeoIllustration hideBackground />}
            action={
              <Button variant="contained" color="primary" onClick={() => router.push(paths.admin.course.list)}>
                View courses
              </Button>
            }
          />
        </Grid>

        <Grid xs={12} md={4}>
          <AppFeatured list={_appFeatured} />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Total users"
            percent={0}
            total={totalUsers}
            chart={{
              categories: CHART_CATEGORIES,
              series: [totalUsers, totalUsers, totalUsers, totalUsers, totalUsers, totalUsers, totalUsers, totalUsers],
            }}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Total courses"
            percent={0}
            total={totalCourses}
            chart={{
              colors: [theme.vars.palette.info.main],
              categories: CHART_CATEGORIES,
              series: [totalCourses, totalCourses, totalCourses, totalCourses, totalCourses, totalCourses, totalCourses, totalCourses],
            }}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Completed orders"
            percent={0}
            total={totalOrders}
            chart={{
              colors: [theme.vars.palette.success.main],
              categories: CHART_CATEGORIES,
              series: [totalOrders, totalOrders, totalOrders, totalOrders, totalOrders, totalOrders, totalOrders, totalOrders],
            }}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AppWidgetSummary
            title="Total revenue (SGD)"
            percent={0}
            total={totalRevenue}
            chart={{
              colors: [theme.vars.palette.warning.main],
              categories: CHART_CATEGORIES,
              series: [totalRevenue, totalRevenue, totalRevenue, totalRevenue, totalRevenue, totalRevenue, totalRevenue, totalRevenue],
            }}
          />
        </Grid>

        <Grid xs={12} lg={8}>
          <AppNewInvoice
            title="Recent orders"
            subheader="Latest completed orders"
            tableData={tableData}
            headLabel={[
              { id: 'invoiceNumber', label: 'Order' },
              { id: 'category', label: 'Customer' },
              { id: 'price', label: 'Amount' },
              { id: 'date', label: 'Date' },
              { id: 'status', label: 'Status' },
            ]}
            onViewAll={() => router.push(paths.admin.order.list)}
          />
        </Grid>

        <Grid xs={12} lg={4}>
          <AppTopRatedCourses
            title="Top rated courses"
            subheader="Based on learner reviews"
            list={topRatedCourses}
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
