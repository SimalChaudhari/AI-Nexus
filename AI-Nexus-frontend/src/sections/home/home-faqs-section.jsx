import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import { FaqsList } from 'src/sections/faqs/faqs-list';

// ----------------------------------------------------------------------

export function HomeFaqsSection() {
  const [pageHeading, setPageHeading] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getFaqContent()
      .then((data) => {
        if (!active) return;
        const heading = String(data?.pageHeading || '').trim();
        setPageHeading(heading ? heading.toUpperCase() : '');
        setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        if (active) {
          setPageHeading('');
          setItems([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!items.length && !pageHeading) return null;

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 4, md: 4 },
        bgcolor: 'background.paper',
      }}
    >
      <DashboardContent component={MotionViewport}>
        <Typography
          component={m.h2}
          variants={varFade({ distance: 24 }).inUp}
          sx={{
            mb: { xs: 3, md: 4 },
            color: 'primary.main',
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontSize: { xs: '1.5rem', sm: '1.65rem', md: '2rem' },
          }}
        >
          {pageHeading}
        </Typography>

        <Box component={m.div} variants={varFade({ distance: 24 }).inUp}>
          <FaqsList items={items} />
        </Box>
      </DashboardContent>
    </Box>
  );
}
