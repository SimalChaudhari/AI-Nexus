import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import { HomeFaqsList } from './home-faqs-list';

import {
  HOME_DASHBOARD_CONTENT_SX,
  HOME_SECTION_BG,
  HOME_SECTION_TITLE_SX,
  HOME_SECTION_UNDERLINE_SX,
} from './home-section-styles';

// ----------------------------------------------------------------------

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
        overflowAnchor: 'none',
      }}
    >
      <DashboardContent sx={HOME_DASHBOARD_CONTENT_SX}>
        <Stack
          spacing={0.75}
          alignItems="flex-start"
          sx={{ mb: { xs: 2, md: 2.5 } }}
        >
          <Typography component="h2" sx={HOME_SECTION_TITLE_SX}>
            {pageHeading}
          </Typography>

          <Box sx={HOME_SECTION_UNDERLINE_SX} />
        </Stack>

        <Box sx={{ overflowAnchor: 'none' }}>
          <HomeFaqsList items={items} />
        </Box>
      </DashboardContent>
    </Box>
  );
}
