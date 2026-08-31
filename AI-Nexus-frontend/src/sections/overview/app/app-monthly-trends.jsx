import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import { alpha, useTheme } from '@mui/material/styles';

import { fNumber, fCurrency } from 'src/utils/format-number';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

export function AppMonthlyTrends({
  title,
  subheader,
  chart,
  type = 'bar',
  emptyMessage = 'No activity recorded for this period yet.',
  sx,
  ...other
}) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.success.main,
  ];

  const series = Array.isArray(chart.series) ? chart.series : [];
  const hasData = series.some((item) =>
    (Array.isArray(item.data) ? item.data : []).some((value) => Number(value) > 0)
  );

  const chartOptions = useChart({
    colors: chartColors,
    chart: { stacked: type === 'bar' && series.length > 1 },
    stroke: type === 'area' ? { width: 2.5, curve: 'smooth' } : { width: 0, curve: 'smooth' },
    fill:
      type === 'area'
        ? { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } }
        : { opacity: 1 },
    xaxis: {
      categories: chart.categories,
      labels: { style: { colors: theme.palette.text.secondary, fontSize: '12px' } },
    },
    yaxis: {
      labels: {
        formatter: (value) => fNumber(value),
        style: { colors: theme.palette.text.secondary, fontSize: '12px' },
      },
    },
    grid: {
      strokeDashArray: 3,
      borderColor: alpha(theme.palette.grey[500], 0.16),
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      markers: { radius: 12 },
      itemMargin: { horizontal: 10 },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: series.length > 1 ? '55%' : '42%',
        borderRadiusApplication: 'end',
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value, opts) => {
          const seriesName = opts?.w?.globals?.seriesNames?.[opts.seriesIndex] || '';
          if (/revenue/i.test(seriesName)) return fCurrency(value);
          return fNumber(value);
        },
      },
    },
    ...chart.options,
  });

  return (
    <Card
      sx={[
        {
          height: 1,
          boxShadow: 'none',
          border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <CardHeader
        title={title}
        subheader={subheader}
        sx={{
          pb: 0,
          '& .MuiCardHeader-title': { typography: 'subtitle1', fontWeight: 700 },
          '& .MuiCardHeader-subheader': { typography: 'body2', mt: 0.5 },
        }}
      />

      {hasData ? (
        <Chart
          type={type}
          series={series}
          options={chartOptions}
          height={300}
          sx={{ py: 2, pl: 1, pr: 2 }}
        />
      ) : (
        <Stack alignItems="center" justifyContent="center" sx={{ height: 300, px: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              mb: 1.5,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.grey[500], 0.08),
              color: 'text.disabled',
              typography: 'h6',
            }}
          >
            —
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {emptyMessage}
          </Typography>
        </Stack>
      )}
    </Card>
  );
}
