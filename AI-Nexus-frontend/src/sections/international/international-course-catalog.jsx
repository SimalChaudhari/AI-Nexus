<<<<<<< HEAD
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

import { Iconify } from 'src/components/iconify';

import { CATALOG_COURSES } from './catalog-courses';
import {
  IntlChangeRegionButton,
  IntlPageFrame,
  IntlPageHeader,
  NAVY,
} from './intl-page-chrome';

// ----------------------------------------------------------------------

export function InternationalCourseCatalog({ region, onChangeRegion }) {
  const navigate = useNavigate();
  const courses = CATALOG_COURSES.filter((c) => c.enabled);

  return (
    <IntlPageFrame>
      <IntlPageHeader
        eyebrow="AI Nexus · International"
        title="Choose your programme"
        subtitle={
          <>
            Select a programme enabled for {region.label}. Content is shown in{' '}
            <Box component="strong" sx={{ color: NAVY, fontWeight: 700 }}>
              {region.language}
            </Box>
            .
          </>
        }
        action={<IntlChangeRegionButton onClick={onChangeRegion} />}
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
        {courses.map((course) => (
          <ProgrammeCard
            key={course.id}
            course={course}
            onEnter={() => {
              if (course.path) navigate(course.path);
            }}
          />
        ))}
      </Box>
    </IntlPageFrame>
  );
}

// ----------------------------------------------------------------------

function ProgrammeCard({ course, onEnter }) {
  const clickable = Boolean(course.path);
  const accent = course.accent;

  return (
    <Box
      sx={{
        height: 1,
        minHeight: 248,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        position: 'relative',
        overflow: 'hidden',
        p: 2,
        pt: 2.25,
        borderRadius: '14px',
        bgcolor: '#fff',
        border: `1.5px solid ${alpha(accent, 0.28)}`,
        backgroundImage: `linear-gradient(165deg, ${alpha(accent, 0.14)} 0%, ${alpha(accent, 0.03)} 42%, #fff 72%)`,
        boxShadow: `0 6px 18px ${alpha(accent, 0.12)}`,
        transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: accent,
        },
        ...(clickable && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-3px)',
            borderColor: accent,
            boxShadow: `0 12px 28px ${alpha(accent, 0.22)}`,
          },
        }),
      }}
      onClick={clickable ? onEnter : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEnter();
              }
            }
          : undefined
      }
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: '10px',
          bgcolor: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1.5,
          flexShrink: 0,
          boxShadow: `0 4px 12px ${alpha(accent, 0.35)}`,
        }}
      >
        <Iconify icon={course.icon} width={22} sx={{ color: '#fff' }} />
      </Box>

      <Typography
        sx={{
          m: 0,
          mb: 0.5,
          color: accent,
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
        }}
      >
        {course.eyebrow}
      </Typography>

      <Typography
        component="h3"
        sx={{
          m: 0,
          mb: 0.75,
          color: NAVY,
          fontWeight: 800,
          fontSize: 15,
          lineHeight: 1.25,
          letterSpacing: '-0.015em',
          minHeight: 38,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {course.title}
      </Typography>

      <Typography
        sx={{
          m: 0,
          mb: 1.75,
          flex: 1,
          color: NAVY,
          fontSize: 12.5,
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {course.blurb}
      </Typography>

      <Button
        fullWidth
        variant="contained"
        disabled={!clickable}
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
        endIcon={clickable ? <Iconify icon="eva:arrow-forward-fill" width={14} /> : undefined}
        sx={{
          mt: 'auto',
          py: 0.9,
          minHeight: 36,
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: 12,
          textTransform: 'none',
          boxShadow: 'none',
          bgcolor: accent,
          color: '#fff',
          opacity: clickable ? 1 : 0.92,
          '&:hover': {
            bgcolor: accent,
            boxShadow: 'none',
            filter: 'brightness(0.9)',
          },
          '&.Mui-disabled': {
            bgcolor: accent,
            color: '#fff',
            opacity: 0.85,
          },
        }}
      >
        {clickable ? 'Enter' : 'Soon'}
      </Button>
    </Box>
  );
}
=======
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

import { Iconify } from 'src/components/iconify';

import { CATALOG_COURSES } from './catalog-courses';
import {
  IntlChangeRegionButton,
  IntlPageFrame,
  IntlPageHeader,
  NAVY,
} from './intl-page-chrome';

// ----------------------------------------------------------------------

export function InternationalCourseCatalog({ region, onChangeRegion }) {
  const navigate = useNavigate();
  const courses = CATALOG_COURSES.filter((c) => c.enabled);

  return (
    <IntlPageFrame>
      <IntlPageHeader
        eyebrow="AI Nexus · International"
        title="Choose your programme"
        subtitle={
          <>
            Select a programme enabled for {region.label}. Content is shown in{' '}
            <Box component="strong" sx={{ color: NAVY, fontWeight: 700 }}>
              {region.language}
            </Box>
            .
          </>
        }
        action={<IntlChangeRegionButton onClick={onChangeRegion} />}
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
        {courses.map((course) => (
          <ProgrammeCard
            key={course.id}
            course={course}
            onEnter={() => {
              if (course.path) navigate(course.path);
            }}
          />
        ))}
      </Box>
    </IntlPageFrame>
  );
}

// ----------------------------------------------------------------------

function ProgrammeCard({ course, onEnter }) {
  const clickable = Boolean(course.path);
  const accent = course.accent;

  return (
    <Box
      sx={{
        height: 1,
        minHeight: 248,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        position: 'relative',
        overflow: 'hidden',
        p: 2,
        pt: 2.25,
        borderRadius: '14px',
        bgcolor: '#fff',
        border: `1.5px solid ${alpha(accent, 0.28)}`,
        backgroundImage: `linear-gradient(165deg, ${alpha(accent, 0.14)} 0%, ${alpha(accent, 0.03)} 42%, #fff 72%)`,
        boxShadow: `0 6px 18px ${alpha(accent, 0.12)}`,
        transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: accent,
        },
        ...(clickable && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-3px)',
            borderColor: accent,
            boxShadow: `0 12px 28px ${alpha(accent, 0.22)}`,
          },
        }),
      }}
      onClick={clickable ? onEnter : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEnter();
              }
            }
          : undefined
      }
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: '10px',
          bgcolor: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1.5,
          flexShrink: 0,
          boxShadow: `0 4px 12px ${alpha(accent, 0.35)}`,
        }}
      >
        <Iconify icon={course.icon} width={22} sx={{ color: '#fff' }} />
      </Box>

      <Typography
        sx={{
          m: 0,
          mb: 0.5,
          color: accent,
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
        }}
      >
        {course.eyebrow}
      </Typography>

      <Typography
        component="h3"
        sx={{
          m: 0,
          mb: 0.75,
          color: NAVY,
          fontWeight: 800,
          fontSize: 15,
          lineHeight: 1.25,
          letterSpacing: '-0.015em',
          minHeight: 38,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {course.title}
      </Typography>

      <Typography
        sx={{
          m: 0,
          mb: 1.75,
          flex: 1,
          color: NAVY,
          fontSize: 12.5,
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {course.blurb}
      </Typography>

      <Button
        fullWidth
        variant="contained"
        disabled={!clickable}
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
        endIcon={clickable ? <Iconify icon="eva:arrow-forward-fill" width={14} /> : undefined}
        sx={{
          mt: 'auto',
          py: 0.9,
          minHeight: 36,
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: 12,
          textTransform: 'none',
          boxShadow: 'none',
          bgcolor: accent,
          color: '#fff',
          opacity: clickable ? 1 : 0.92,
          '&:hover': {
            bgcolor: accent,
            boxShadow: 'none',
            filter: 'brightness(0.9)',
          },
          '&.Mui-disabled': {
            bgcolor: accent,
            color: '#fff',
            opacity: 0.85,
          },
        }}
      >
        {clickable ? 'Enter' : 'Soon'}
      </Button>
    </Box>
  );
}
>>>>>>> 77824e39b799c567de95e0752cc504d0a0a4c3d1
