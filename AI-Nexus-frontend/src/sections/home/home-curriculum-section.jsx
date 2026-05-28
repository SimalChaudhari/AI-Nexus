import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import {
  buildCurriculumHeadline,
  normalizeCurriculumContent,
} from './curriculum-defaults';
import { CurriculumModulesList } from './curriculum-modules-list';

// ----------------------------------------------------------------------

export function HomeCurriculumSection() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await appSettingsService.getCurriculumContent();
        if (!active) return;
        setPayload(data);
      } catch {
        try {
          const settings = await appSettingsService.getPublic();
          if (!active) return;
          const stored = normalizeCurriculumContent(settings?.curriculumContent);
          setPayload({
            ...stored,
            moduleCount: 0,
            modules: [],
            courses: [],
            headline: buildCurriculumHeadline(0, stored),
          });
        } catch {
          if (active) setPayload(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const content = normalizeCurriculumContent(payload);
  const modules = Array.isArray(payload?.modules) ? payload.modules : [];
  const courses = Array.isArray(payload?.courses) ? payload.courses : [];
  const courseIds = Array.isArray(payload?.courseIds) ? payload.courseIds : [];
  const headline = String(payload?.headline || '').trim();
  const smallTitle = String(content.smallTitle || '').trim();
  const subtext = String(content.subtext || '').trim();
  const shouldHide =
    !loading &&
    !modules.length &&
    !courses.length &&
    !courseIds.length &&
    !smallTitle &&
    !headline &&
    !subtext;

  if (shouldHide) {
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
            component={m.p}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
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
            component={m.h2}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.04 }}
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
            component={m.p}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
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

        <Box component={m.div} variants={varFade({ distance: 24 }).inUp}>
          {loading ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Loading curriculum...
            </Typography>
          ) : (
            <CurriculumModulesList
              modules={modules}
              courses={courses}
              courseIds={courseIds}
            />
          )}
        </Box>
      </DashboardContent>
    </Box>
  );
}
