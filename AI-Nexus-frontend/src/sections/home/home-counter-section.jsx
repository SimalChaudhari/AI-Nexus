import { useRef, useEffect } from 'react';
import { m, animate, useInView, useTransform, useMotionValue } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { useTheme } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const COUNTERS = [
  { label: 'AI Enthusiasts', target: 50, unit: 'K+', toFixed: 0 },
  { label: 'AI Communities', target: 1200, unit: '+', toFixed: 0, formatWithComma: true },
  { label: 'Learning Modules', target: 25, unit: 'K+', toFixed: 0 },
  { label: 'AI Resources', target: 10, unit: 'K+', toFixed: 0 },
];

// ----------------------------------------------------------------------

function AnimateCountUpWithFormat({
  to,
  unit,
  toFixed = 0,
  formatWithComma = false,
  sx,
  ...other
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const count = useMotionValue(0);

  const rounded = useTransform(count, (latest) => {
    const fixed = latest.toFixed(toFixed);
    return formatWithComma ? Number(fixed).toLocaleString() : fixed;
  });

  useEffect(() => {
    if (inView) {
      animate(count, to, { duration: 2 });
    }
  }, [count, inView, to]);

  return (
    <Typography
      component="span"
      sx={{
        display: 'inline-flex',
        p: 0,
        m: 0,
        ...sx,
      }}
      {...other}
    >
      <m.span ref={ref}>{rounded}</m.span>
      {unit}
    </Typography>
  );
}

// ----------------------------------------------------------------------

export function HomeCounterSection() {
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 10, md: 15 },
        background: 'linear-gradient(135deg, #56c7da, #fcd60b)',
      }}
    >
      <DashboardContent component={MotionViewport}>
        <Grid
          container
          spacing={4}
          sx={{
            textAlign: 'center',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {COUNTERS.map((counter) => (
            <Grid key={counter.label} xs={6} md={3}>
              <Stack
                spacing={1}
                component={m.div}
                variants={varFade().inUp}
                sx={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                <AnimateCountUpWithFormat
                  to={counter.target}
                  unit={counter.unit}
                  toFixed={counter.toFixed}
                  formatWithComma={counter.formatWithComma}
                  sx={{
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 'bold',
                    color: 'common.white',
                    fontFamily: 'Montserrat, sans-serif',
                    textAlign: 'center',
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    color: 'common.white',
                    opacity: 0.9,
                    textAlign: 'center',
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: '500',
                  }}
                >
                  {counter.label}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </DashboardContent>
    </Box>
  );
}

