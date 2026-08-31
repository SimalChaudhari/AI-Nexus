import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { fNumber, fPercent, fCurrency } from 'src/utils/format-number';
import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function formatTrendLabel(percent) {
  const value = Number(percent);
  if (!Number.isFinite(value) || value === 0) return { text: 'No change', tone: 'neutral' };
  if (value <= -99.5) return { text: 'Quiet this week', tone: 'neutral' };
  if (value >= 99.5 && value <= 100) return { text: 'New this week', tone: 'up' };
  return {
    text: `${value > 0 ? '+' : ''}${fPercent(value)}`,
    tone: value > 0 ? 'up' : 'down',
  };
}

export function AppWidgetSummary({
  title,
  percent = 0,
  total,
  chart,
  format = 'number',
  icon = 'solar:chart-bold-duotone',
  color = 'primary',
  trendPeriod = '· 7 days',
  tag,
  hideTrend = false,
  sx,
  ...other
}) {
  const theme = useTheme();
  const palette = theme.palette[color] || theme.palette.primary;

  const chartColors = chart?.colors ?? [palette.main];
  const series = Array.isArray(chart?.series) ? chart.series : [];
  const categories = Array.isArray(chart?.categories)
    ? chart.categories
    : series.map((_, i) => `${i + 1}`);

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    stroke: { width: 0 },
    xaxis: { categories },
    tooltip: {
      y: {
        formatter: (value) => (format === 'currency' ? fCurrency(value) : fNumber(value)),
        title: { formatter: () => '' },
      },
    },
    plotOptions: { bar: { borderRadius: 2, columnWidth: '58%' } },
    ...chart?.options,
  });

  const displayTotal = format === 'currency' ? fCurrency(total) : fNumber(total);
  const trend = formatTrendLabel(percent);
  const trendColor =
    trend.tone === 'up'
      ? theme.palette.success.main
      : trend.tone === 'down'
        ? theme.palette.error.main
        : theme.palette.text.secondary;

  return (
    <Card
      sx={{
        p: 2.5,
        height: 1,
        border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
        boxShadow: 'none',
        background: `linear-gradient(180deg, ${alpha(palette.main, 0.04)} 0%, ${theme.palette.background.paper} 48%)`,
        ...sx,
      }}
      {...other}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: palette.main,
            bgcolor: alpha(palette.main, 0.12),
          }}
        >
          <Iconify icon={icon} width={22} />
        </Box>

        {tag ? (
          <Label
            variant="filled"
            color={color === 'info' ? 'info' : color === 'success' ? 'success' : 'primary'}
            startIcon={<Iconify icon="solar:diploma-verified-bold" width={14} />}
            sx={{
              height: 24,
              px: 1,
              fontWeight: 700,
              letterSpacing: 0.2,
              boxShadow: `0 6px 12px ${alpha(palette.main, 0.28)}`,
            }}
          >
            {tag}
          </Label>
        ) : series.some((n) => Number(n) > 0) ? (
          <Chart
            type="bar"
            series={[{ data: series }]}
            options={chartOptions}
            width={72}
            height={36}
          />
        ) : null}
      </Stack>

      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>
        {title}
      </Typography>

      <Typography
        variant="h4"
        sx={{
          mt: 0.75,
          fontWeight: 700,
          letterSpacing: -0.4,
          wordBreak: 'break-word',
          lineHeight: 1.2,
        }}
      >
        {displayTotal}
      </Typography>

      {hideTrend ? null : (
      <Box
        sx={{
          mt: 1.5,
          px: 1,
          py: 0.35,
          width: 'fit-content',
          borderRadius: 1,
          bgcolor: alpha(trendColor, 0.08),
          color: trendColor,
          typography: 'caption',
          fontWeight: 600,
        }}
      >
        {trend.text}
        <Box component="span" sx={{ ml: 0.5, fontWeight: 500, opacity: 0.8 }}>
          {trendPeriod}
        </Box>
      </Box>
      )}
    </Card>
  );
}
