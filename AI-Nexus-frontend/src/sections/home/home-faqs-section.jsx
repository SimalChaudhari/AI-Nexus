import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import { FaqsList } from 'src/sections/faqs/faqs-list';

import {
  HOME_DASHBOARD_CONTENT_SX,
  HOME_SECTION_BG,
  HOME_SECTION_CARD_SX,
  HOME_SECTION_TITLE_SX,
  HOME_SECTION_UNDERLINE_SX,
} from './home-section-styles';

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
        py: { xs: 2, md: 2.5 },
        bgcolor: 'grey.200',
        background: HOME_SECTION_BG,
      }}
    >
      <DashboardContent component={MotionViewport} sx={HOME_DASHBOARD_CONTENT_SX}>
        <Stack
          component={m.div}
          variants={varFade({ distance: 24 }).inUp}
          spacing={0.75}
          alignItems="flex-start"
          sx={{ mb: { xs: 2, md: 2.5 } }}
        >
          <Typography component="h2" sx={HOME_SECTION_TITLE_SX}>
            {pageHeading}
          </Typography>

          <Box sx={HOME_SECTION_UNDERLINE_SX} />
        </Stack>

        <Box
          component={m.div}
          variants={varFade({ distance: 24 }).inUp}
          sx={{
            ...HOME_SECTION_CARD_SX,
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <FaqsList items={items} compact />
        </Box>
      </DashboardContent>
    </Box>
  );
}
