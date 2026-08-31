import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { RichTextContent } from 'src/components/html-content';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import { buildCurriculumHeadline, normalizeCurriculumContent } from './curriculum-defaults';
import { CurriculumModulesList } from './curriculum-modules-list';
import {
  FLUID_TYPOGRAPHY,
  HOME_SECTION_BADGE_SX,
  HOME_SECTION_HEADING_SX,
} from 'src/theme/home-typography';
import { Card } from '@mui/material';

// ----------------------------------------------------------------------

const RED = '#E32B24';

function SectionUnderline() {
  return (
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
  );
}

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
            headline: '',
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
  const categories = Array.isArray(payload?.categories) ? payload.categories : [];
  const categoryIds = Array.isArray(payload?.categoryIds) ? payload.categoryIds : [];
  const moduleCount = Number(payload?.moduleCount) || modules.length;
  const builtHeadline = buildCurriculumHeadline(moduleCount);
  const apiHeadline = String(payload?.headline || '').trim();
  const headline = moduleCount === 0 ? builtHeadline : apiHeadline || builtHeadline;
  const smallTitle = String(payload?.smallTitle || content.smallTitle || '').trim();
  const subtext = String(payload?.subtext || content.subtext || '').trim();
  const hasHeader = Boolean(smallTitle || headline || subtext);
  const shouldHide =
    !loading &&
    !modules.length &&
    !courses.length &&
    !courseIds.length &&
    !categories.length &&
    !categoryIds.length &&
    !hasHeader;

  if (shouldHide) {
    return null;
  }

  return (
    <Box
      component="section"
      sx={{
        py: 4,
        bgcolor: 'background.paper',
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
        {hasHeader ? (
          <Stack
            spacing={{ xs: 1.5, md: 2 }}
            alignItems="flex-start"
            sx={{ mb: 2.5, maxWidth: 900 }}
          >
            {smallTitle ? (
              <Typography
                component="span"
                sx={{
                  ...HOME_SECTION_BADGE_SX,
                  color: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                }}
              >
                {smallTitle}
              </Typography>
            ) : null}

            {subtext ? (
              <RichTextContent
                html={subtext}
                sx={{
                  color: 'text.secondary',
                  ...FLUID_TYPOGRAPHY.sectionSubtitle,
                  maxWidth: 720,
                  '& p': { m: 0, mb: 1 },
                  '& p:last-child': { mb: 0 },
                  '& ul, & ol': { m: 0, pl: 2.5, mb: 1 },
                  '& a': { color: 'primary.main', fontWeight: 600 },
                }}
              />
            ) : null}
          </Stack>
        ) : null}

        <Box component={m.div} variants={varFade({ distance: 24 }).inUp}>
        <Card
          component={m.div}
          variants={varFade({ distance: 24 }).inUp}
          sx={{
            p: 2.5,
            borderRadius: 2,
            boxShadow: (theme) => theme.customShadows?.card,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <CurriculumModulesList
            modules={modules}
            courses={courses}
            courseIds={courseIds}
            categories={categories}
            categoryIds={categoryIds}
          />
        </Card>
        </Box>
      </DashboardContent>
    </Box>
  );
}
