import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import { alpha, useTheme } from '@mui/material/styles';

import { fNumber } from 'src/utils/format-number';
import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

export function AppCurrentDownload({ title, subheader, chart, sx, ...other }) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.grey[500],
    theme.palette.info.main,
  ];

  const seriesItems = Array.isArray(chart.series) ? chart.series : [];
  const chartSeries = seriesItems.map((item) => item.value);
  const hasData = chartSeries.some((value) => Number(value) > 0);

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    labels: seriesItems.map((item) => item.label),
    stroke: { width: 0 },
    tooltip: {
      y: {
        formatter: (value) => fNumber(value),
        title: { formatter: (seriesName) => `${seriesName}` },
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '78%',
          labels: {
            show: true,
            value: {
              formatter: (value) => fNumber(value),
              fontSize: '18px',
              fontWeight: 700,
            },
            total: {
              show: true,
              label: 'Orders',
              fontSize: '13px',
              formatter: (w) => {
                const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return fNumber(sum);
              },
            },
          },
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
          '& .MuiCardHeader-title': { typography: 'subtitle1', fontWeight: 700 },
          '& .MuiCardHeader-subheader': { typography: 'body2', mt: 0.5 },
        }}
      />

      {hasData ? (
        <>
          <Chart
            type="donut"
            series={chartSeries}
            options={chartOptions}
            width={{ xs: 220, xl: 240 }}
            height={{ xs: 220, xl: 240 }}
            sx={{ my: 3, mx: 'auto' }}
          />

          <Divider sx={{ borderStyle: 'dashed' }} />

          <ChartLegends
            labels={chartOptions?.labels}
            colors={chartOptions?.colors}
            sx={{ p: 2.5, justifyContent: 'center' }}
          />
        </>
      ) : (
        <Chart
          type="donut"
          series={[1]}
          options={{
            ...chartOptions,
            labels: ['No orders'],
            colors: [alpha(theme.palette.grey[500], 0.24)],
            legend: { show: false },
            tooltip: { enabled: false },
            plotOptions: {
              pie: {
                donut: {
                  size: '78%',
                  labels: {
                    show: true,
                    total: {
                      show: true,
                      label: 'Orders',
                      formatter: () => '0',
                    },
                  },
                },
              },
            },
          }}
          width={{ xs: 220, xl: 240 }}
          height={{ xs: 220, xl: 240 }}
          sx={{ my: 6, mx: 'auto' }}
        />
      )}
    </Card>
  );
}
