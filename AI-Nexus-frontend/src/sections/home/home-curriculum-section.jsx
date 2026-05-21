import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import {
  DEFAULT_CURRICULUM_CONTENT,
  normalizeCurriculumContent,
} from './curriculum-defaults';
import { CurriculumModulesList } from './curriculum-modules-list';

// ----------------------------------------------------------------------

export function HomeCurriculumSection() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getCurriculumContent()
      .then((data) => {
        if (!active) return;
        setPayload(data);
      })
      .catch(() => {
        if (active) setPayload(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const content = normalizeCurriculumContent(payload || DEFAULT_CURRICULUM_CONTENT);
  const modules = Array.isArray(payload?.modules) ? payload.modules : [];
  const headline = String(payload?.headline || '').trim();
  const smallTitle = String(content.smallTitle || '').trim();
  const subtext = String(content.subtext || '').trim();

  if (!loading && !modules.length && !smallTitle && !headline) {
    return null;
  }

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 5, md: 7 },
        bgcolor: 'background.paper',
      }}
    >
      <DashboardContent component={MotionViewport}>
        {smallTitle ? (
          <Typography
            component="p"
            variants={varFade({ distance: 24 }).inUp}
            sx={{
              mb: 1.5,
              color: 'primary.main',
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              fontSize: { xs: '0.8rem', md: '0.875rem' },
            }}
          >
            {smallTitle}
          </Typography>
        ) : null}

        {headline ? (
          <Typography
            component="h2"
            variants={varFade({ distance: 24 }).inUp}
            sx={{
              mb: subtext ? 2 : { xs: 3, md: 4 },
              color: 'text.primary',
              fontWeight: 800,
              lineHeight: 1.2,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.35rem' },
            }}
          >
            {headline}
          </Typography>
        ) : null}

        {subtext ? (
          <Typography
            variants={varFade({ distance: 24 }).inUp}
            sx={{
              mb: { xs: 3, md: 5 },
              color: 'text.secondary',
              maxWidth: 720,
              fontSize: { xs: '1rem', md: '1.05rem' },
            }}
          >
            {subtext}
          </Typography>
        ) : null}

        <Box variants={varFade({ distance: 24 }).inUp}>
          {loading ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Loading curriculum...
            </Typography>
          ) : (
            <CurriculumModulesList
              modules={modules}
              courses={Array.isArray(payload?.courses) ? payload.courses : []}
              courseIds={Array.isArray(payload?.courseIds) ? payload.courseIds : []}
            />
          )}
        </Box>
      </DashboardContent>
    </Box>
  );
}
