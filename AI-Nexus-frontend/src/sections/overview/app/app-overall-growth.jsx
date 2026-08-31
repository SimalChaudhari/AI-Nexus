import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { Iconify } from 'src/components/iconify';

import { AppWidgetSummary } from './app-widget-summary';

const EMPTY_METRIC = { total: 0, previousTotal: 0, percentChange: 0 };

export function AppOverallGrowth({ data }) {
  const theme = useTheme();
  const router = useRouter();

  const enrolled = data?.enrolledUsers || EMPTY_METRIC;
  const badges = data?.badgeEarners || EMPTY_METRIC;
  const champions = data?.champions || EMPTY_METRIC;

  return (
    <Card
      sx={{
        width: 1,
        p: { xs: 2, md: 2.5 },
        boxShadow: 'none',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${theme.palette.background.paper} 38%)`,
      }}
    >
      <Stack spacing={2.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
              Weekly Metric No. 1
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              Overall Growth — platform totals today, compared with last week
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            endIcon={<Iconify icon="solar:arrow-right-bold" width={18} />}
            onClick={() => router.push(paths.admin.weeklyMetrics)}
            sx={{ fontWeight: 700, flexShrink: 0 }}
          >
            View weekly report
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          }}
        >
          <AppWidgetSummary
            title="Total Enrolled Users"
            percent={enrolled.percentChange ?? 0}
            total={enrolled.total ?? 0}
            icon="solar:users-group-rounded-bold-duotone"
            color="primary"
            trendPeriod="· vs last week"
          />
          <AppWidgetSummary
            title="Total Digital Badge Earners"
            percent={badges.percentChange ?? 0}
            total={badges.total ?? 0}
            icon="solar:medal-ribbons-star-bold-duotone"
            color="warning"
            trendPeriod="· vs last week"
          />
          <AppWidgetSummary
            title="Total Champions"
            percent={champions.percentChange ?? 0}
            total={champions.total ?? 0}
            icon="solar:cup-star-bold-duotone"
            color="success"
            trendPeriod="· vs last week"
          />
        </Box>
      </Stack>
    </Card>
  );
}
