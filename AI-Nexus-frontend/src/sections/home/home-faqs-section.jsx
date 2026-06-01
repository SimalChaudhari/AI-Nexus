import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import { FaqsList } from 'src/sections/faqs/faqs-list';
import { HOME_SECTION_HEADING_SX } from 'src/theme/home-typography';

// ----------------------------------------------------------------------

const RED = '#E32B24';

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
        bgcolor: 'grey.200',
        background: 'linear-gradient(180deg, #f4f6f8 0%, #eceef1 48%, #f4f6f8 100%)',
      }}
    >
      <DashboardContent
          component={MotionViewport}
          sx={{
            width: 1,
            maxWidth: '100%',
            mx: 'auto',
            px: { xs: 1.25, sm: 2, md: 3, lg: 4 },
            pt: 0,
            pb: 0,
          }}
        >
        <Stack
          component={m.div}
          variants={varFade({ distance: 24 }).inUp}
          spacing={1.5}
          alignItems="flex-start"
          sx={{ mb: { xs: 3, md: 4 } }}
        >
          <Typography component="h2" sx={HOME_SECTION_HEADING_SX}>
            {pageHeading}
          </Typography>

          <Box
            sx={{
              width: { xs: 72, sm: 88, md: 104 },
              height: 4,
              borderRadius: 999,
              background: (theme) =>
                `linear-gradient(90deg, ${RED} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: `0 4px 12px ${alpha(RED, 0.28)}`,
            }}
          />
        </Stack>

        <Box component={m.div} variants={varFade({ distance: 24 }).inUp}>
          <FaqsList items={items} />
        </Box>
      </DashboardContent>
    </Box>
  );
}
