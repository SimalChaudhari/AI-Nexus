'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';

import { Iconify } from 'src/components/iconify';

import { CATALOG_COURSES } from './catalog-courses';
import { IntlPageFrame, IntlPageHeader, NAVY } from './intl-page-chrome';

// ----------------------------------------------------------------------

/** Kept for older imports — landing page now owns the catalogue UI. */
export function InternationalCourseCatalog() {
  const router = useRouter();
  const courses = CATALOG_COURSES.filter((c) => c.enabled);

  return (
    <IntlPageFrame>
      <IntlPageHeader
        eyebrow="AI Nexus · International"
        title="Create your path. Build your future."
        subtitle="Choose a programme to continue."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, md: 1.75 },
          alignItems: 'stretch',
        }}
      >
        {courses.map((course) => {
          const clickable = Boolean(course.path);
          const accent = course.accent;
          return (
            <Box
              key={course.id}
              sx={{
                minHeight: 248,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                p: 2,
                borderRadius: '14px',
                bgcolor: '#fff',
                border: `1px solid ${alpha(NAVY, 0.08)}`,
                boxShadow: `0 6px 18px ${alpha(NAVY, 0.08)}`,
                ...(clickable && { cursor: 'pointer' }),
              }}
              onClick={() => {
                if (course.path) router.push(course.path);
              }}
            >
              <Iconify icon={course.icon} width={40} sx={{ color: accent, mb: 1.25 }} />
              <Typography sx={{ color: accent, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', mb: 1 }}>
                {course.title}
              </Typography>
              <Typography sx={{ flex: 1, fontSize: 12.5, color: alpha(NAVY, 0.78), mb: 1.5 }}>
                {course.blurb}
              </Typography>
              <Button
                fullWidth
                variant="contained"
                disabled={!clickable}
                endIcon={<Iconify icon="eva:arrow-forward-fill" width={14} />}
                sx={{ bgcolor: accent, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: accent } }}
              >
                {clickable ? 'Explore' : 'Soon'}
              </Button>
            </Box>
          );
        })}
      </Box>
    </IntlPageFrame>
  );
}
