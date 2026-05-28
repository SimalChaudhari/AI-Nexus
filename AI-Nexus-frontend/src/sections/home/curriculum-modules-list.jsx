import { m } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { courseService } from 'src/services/course.service';
import { ViewHtmlContent } from 'src/components/html-content/view-html-content';

// ----------------------------------------------------------------------

const MODULE_DIVIDER_SX = {
  borderColor: 'primary.main',
  opacity: 0.35,
};

function formatModulesCountLabel(count) {
  const value = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return `${value} module${value === 1 ? '' : 's'}`;
}

function buildCurriculumRows(courses = [], modules = [], courseIds = []) {
  const orderIds =
    courseIds.length > 0
      ? courseIds
      : courses.map((c) => c.id).filter(Boolean);

  const courseById = new Map(
    (courses || []).map((c) => [String(c.id), c])
  );
  const modulesByCourse = new Map();

  (modules || []).forEach((row) => {
    const courseId = String(row?.courseId || '').trim();
    if (!courseId) return;
    if (!modulesByCourse.has(courseId)) {
      modulesByCourse.set(courseId, []);
    }
    modulesByCourse.get(courseId).push(row);
  });

  const seen = new Set();
  const rows = [];

  orderIds.forEach((id, slotIndex) => {
    const courseId = String(id || '').trim();
    if (!courseId || seen.has(courseId)) return;
    seen.add(courseId);

    const course = courseById.get(courseId);
    const courseTitle = String(course?.title || '').trim() || 'Course';
    const listedModules = modulesByCourse.get(courseId) || [];
    const storedCount = Number(course?.modulesCount);
    const modulesCount = Number.isFinite(storedCount)
      ? Math.max(0, storedCount)
      : listedModules.length;

    rows.push({
      index: slotIndex,
      courseId,
      courseTitle,
      modulesCount,
      modules: listedModules,
    });
  });

  return rows;
}

function CurriculumCourseRow({ row, expanded, onToggle, isLast }) {
  const [resolvedModules, setResolvedModules] = useState(null);
  const [resolvedCount, setResolvedCount] = useState(null);

  const courseHref = row.courseId ? paths.learningCourse.details(row.courseId) : null;
  const modulesToShow = resolvedModules ?? row.modules ?? [];
  const moduleCount =
    resolvedCount != null
      ? resolvedCount
      : Number.isFinite(row.modulesCount)
        ? row.modulesCount
        : modulesToShow.length;

  useEffect(() => {
    if (!expanded) {
      setResolvedModules(null);
      setResolvedCount(null);
      return undefined;
    }

    if (row.modules.length > 0) {
      setResolvedModules(row.modules);
      setResolvedCount(row.modules.length);
      return undefined;
    }

    if (!row.courseId) {
      setResolvedModules([]);
      setResolvedCount(0);
      return undefined;
    }

    let active = true;

    courseService
      .getCourseModulesWithSections(row.courseId)
      .then((apiRows) => {
        if (!active) return;
        const mapped = (apiRows || [])
          .map((mod, modIndex) => ({
            index: modIndex,
            moduleId: mod.id,
            title: String(mod?.title || '').trim(),
            description: String(mod?.description || '').trim(),
            courseId: row.courseId,
          }))
          .filter((mod) => mod.title);
        setResolvedModules(mapped);
        setResolvedCount(mapped.length);
      })
      .catch(() => {
        if (active) {
          setResolvedModules([]);
          setResolvedCount(0);
        }
      });

    return () => {
      active = false;
    };
  }, [expanded, row.courseId, row.modules]);

  const headline = `Module ${row.index} · ${row.courseTitle}`;

  return (
    <Box
      component={m.div}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <IconButton
            onClick={onToggle}
            aria-label={expanded ? 'Collapse modules' : 'Expand modules'}
            sx={{
              flexShrink: 0,
              mt: 0.25,
              p: 0,
              width: 24,
              height: 24,
              color: 'common.black',
              borderRadius: 0,
              '&:hover': { bgcolor: 'transparent' },
            }}
          >
            <Iconify
              icon={expanded ? 'eva:minus-fill' : 'eva:plus-fill'}
              width={18}
              sx={{ color: 'common.black' }}
            />
          </IconButton>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body1"
              onClick={onToggle}
              sx={{
                color: 'primary.main',
                fontWeight: 500,
                lineHeight: 1.5,
                cursor: 'pointer',
              }}
            >
              {headline}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
              {formatModulesCountLabel(moduleCount)}
            </Typography>
          </Box>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ pl: 4.5, pt: 1.5, pb: 0.5 }}>
            {modulesToShow.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                {formatModulesCountLabel(0)}
              </Typography>
            ) : null}

            {modulesToShow.length > 0 ? (
              <Stack spacing={1.25} component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                {modulesToShow.map((mod, modIndex) => {
                  const modTitle = String(mod?.title || '').trim();
                  const modDescription = String(mod?.description || '').trim();
                  const label = `Module ${modIndex + 1} · ${modTitle}`;

                  return (
                    <Box component="li" key={`${row.courseId}-${mod.moduleId || modIndex}-${modTitle}`}>
                      {courseHref ? (
                        <Link
                          component={RouterLink}
                          href={courseHref}
                          variant="body2"
                          sx={{
                            color: 'text.primary',
                            fontWeight: 500,
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {label}
                        </Link>
                      ) : (
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {label}
                        </Typography>
                      )}
                      {modDescription ? (
                        <ViewHtmlContent
                          html={modDescription}
                          sx={{
                            mt: 0.5,
                            color: 'text.secondary',
                            typography: 'caption',
                            '& p': { m: 0, mb: 0.5 },
                          }}
                        />
                      ) : null}
                    </Box>
                  );
                })}
              </Stack>
            ) : null}
          </Box>
        </Collapse>
      </Box>

      {!isLast ? <Divider sx={MODULE_DIVIDER_SX} /> : null}
    </Box>
  );
}

export function CurriculumModulesList({ modules = [], courses = [], courseIds = [] }) {
  const [expandedKey, setExpandedKey] = useState(null);

  const curriculumRows = useMemo(
    () => buildCurriculumRows(courses, modules, courseIds),
    [courses, modules, courseIds]
  );

  useEffect(() => {
    if (!curriculumRows.length) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey((prev) => {
      if (prev && curriculumRows.some((row) => row.courseId === prev)) return prev;
      const withModules =
        curriculumRows.find((row) => (row.modules || []).length > 0)
        || curriculumRows.find((row) => Number(row.modulesCount) > 0);
      return withModules?.courseId || curriculumRows[0]?.courseId || null;
    });
  }, [curriculumRows]);

  if (!curriculumRows.length) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        No courses have been added to the curriculum yet.
      </Typography>
    );
  }

  const leftColumn = curriculumRows.filter((_, index) => index % 2 === 0);
  const rightColumn = curriculumRows.filter((_, index) => index % 2 === 1);

  const renderColumn = (columnRows) =>
    columnRows.map((row, columnIndex) => {
      const rowKey = row.courseId;
      const isLastInColumn = columnIndex === columnRows.length - 1;

      return (
        <CurriculumCourseRow
          key={rowKey}
          row={row}
          expanded={expandedKey === rowKey}
          onToggle={() => setExpandedKey((prev) => (prev === rowKey ? null : rowKey))}
          isLast={isLastInColumn}
        />
      );
    });

  return (
    <Grid
      container
      spacing={{ xs: 0, md: 6 }}
      component={m.div}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Grid item xs={12} md={6}>
        {renderColumn(leftColumn)}
      </Grid>
      <Grid item xs={12} md={6}>
        {renderColumn(rightColumn)}
      </Grid>
    </Grid>
  );
}
