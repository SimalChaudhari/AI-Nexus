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

const CURRICULUM_RED = '#E32B24';
const CURRICULUM_COURSE_BLUE = '#2563eb';
const TOGGLE_SIZE = 24;
const TOGGLE_GAP = 12;
const NESTED_INDENT = TOGGLE_SIZE + TOGGLE_GAP;

const ROW_DIVIDER_SX = {
  borderColor: CURRICULUM_RED,
  opacity: 0.35,
};

function formatModulesCountLabel(count) {
  const value = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return `${value} module${value === 1 ? '' : 's'}`;
}

function formatCoursesCountLabel(count) {
  const value = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return `${value} course${value === 1 ? '' : 's'}`;
}

function formatCourseWithModuleCount(title, modulesCount) {
  const name = String(title || '').trim() || 'Course';
  const count = Number.isFinite(modulesCount) ? Math.max(0, Math.floor(modulesCount)) : 0;
  return `${name} (${count} module${count === 1 ? '' : 's'})`;
}

function buildModulesByCourse(modules = []) {
  const modulesByCourse = new Map();

  (modules || []).forEach((row) => {
    const courseId = String(row?.courseId || '').trim();
    if (!courseId) return;
    if (!modulesByCourse.has(courseId)) {
      modulesByCourse.set(courseId, []);
    }
    modulesByCourse.get(courseId).push(row);
  });

  return modulesByCourse;
}

function buildCourseRow(course, modulesByCourse, slotIndex) {
  const courseId = String(course?.id || course?.courseId || '').trim();
  if (!courseId) return null;

  const courseTitle = String(course?.title || course?.courseTitle || '').trim() || 'Course';
  const listedModules = modulesByCourse.get(courseId) || [];
  const storedCount = Number(course?.modulesCount);
  const modulesCount = Number.isFinite(storedCount)
    ? Math.max(0, storedCount)
    : listedModules.length;

  return {
    index: slotIndex,
    courseId,
    courseTitle,
    modulesCount,
    modules: listedModules,
  };
}

function buildCurriculumRows(courses = [], modules = [], courseIds = []) {
  const orderIds =
    courseIds.length > 0 ? courseIds : courses.map((c) => c.id).filter(Boolean);
  const modulesByCourse = buildModulesByCourse(modules);
  const seen = new Set();
  const rows = [];

  orderIds.forEach((id, slotIndex) => {
    const courseId = String(id || '').trim();
    if (!courseId || seen.has(courseId)) return;
    seen.add(courseId);

    const course = (courses || []).find((c) => String(c.id) === courseId) || { id: courseId };
    const row = buildCourseRow(course, modulesByCourse, slotIndex);
    if (row) rows.push(row);
  });

  return rows;
}

function buildCurriculumCategoryRows(categories = [], modules = [], categoryIds = []) {
  const orderIds =
    categoryIds.length > 0 ? categoryIds : categories.map((c) => c.id).filter(Boolean);
  const categoryById = new Map((categories || []).map((c) => [String(c.id), c]));
  const modulesByCourse = buildModulesByCourse(modules);
  const seen = new Set();
  const rows = [];

  orderIds.forEach((id, slotIndex) => {
    const categoryId = String(id || '').trim();
    if (!categoryId || seen.has(categoryId)) return;
    seen.add(categoryId);

    const category = categoryById.get(categoryId);
    if (!category) return;

    const categoryTitle = String(category?.title || '').trim() || 'Category';
    const categoryCourses = Array.isArray(category?.courses) ? category.courses : [];
    const orderCourseIds =
      Array.isArray(category?.courseIds) && category.courseIds.length
        ? category.courseIds
        : categoryCourses.map((c) => c.id).filter(Boolean);

    const courseSeen = new Set();
    const courses = [];

    orderCourseIds.forEach((courseIdRaw, courseIndex) => {
      const courseId = String(courseIdRaw || '').trim();
      if (!courseId || courseSeen.has(courseId)) return;
      courseSeen.add(courseId);

      const course =
        categoryCourses.find((c) => String(c.id) === courseId) || { id: courseId };
      const row = buildCourseRow(course, modulesByCourse, courseIndex);
      if (row) courses.push(row);
    });

    rows.push({
      index: slotIndex,
      categoryId,
      categoryTitle,
      coursesCount: courses.length,
      courses,
    });
  });

  return rows;
}

function ExpandToggle({ expanded, onToggle, label }) {
  return (
    <IconButton
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-label={label}
      sx={{
        flexShrink: 0,
        mt: 0.1,
        p: 0,
        width: TOGGLE_SIZE,
        height: TOGGLE_SIZE,
        minWidth: TOGGLE_SIZE,
        color: 'common.black',
        borderRadius: 0,
        '&:hover': { bgcolor: 'transparent' },
      }}
    >
      <Iconify
        icon={expanded ? 'eva:minus-fill' : 'eva:plus-fill'}
        width={16}
        sx={{ color: 'common.black' }}
      />
    </IconButton>
  );
}

function ModuleList({ row, modulesToShow, moduleCount, courseHref }) {
  if (modulesToShow.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', py: 0.5 }}>
        {formatModulesCountLabel(moduleCount)}
      </Typography>
    );
  }

  return (
    <Stack spacing={1} component="ul" sx={{ m: 0, pl: 0, listStyle: 'none', py: 0.5 }}>
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
  );
}

function CurriculumCourseModules({ row, expanded, nested = false }) {
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

  return (
    <Collapse in={expanded} unmountOnExit={false}>
      <Box
        sx={{
          position: 'relative',
          pl: nested ? `${NESTED_INDENT}px` : 2,
          pt: 0.5,
          pb: 0.25,
          ...(nested
            ? {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 11,
                  top: 0,
                  bottom: 8,
                  width: '1px',
                  bgcolor: 'grey.300',
                },
              }
            : {}),
        }}
      >
        <ModuleList
          row={row}
          modulesToShow={modulesToShow}
          moduleCount={moduleCount}
          courseHref={courseHref}
        />
      </Box>
    </Collapse>
  );
}

function NestedCourseRow({ row, expanded, onToggle, isLast }) {
  const headline = formatCourseWithModuleCount(row.courseTitle, row.modulesCount);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: `${TOGGLE_GAP}px`, py: 1.25 }}>
        <ExpandToggle
          expanded={expanded}
          onToggle={onToggle}
          label={expanded ? 'Collapse modules' : 'Expand modules'}
        />
        <Typography
          variant="body2"
          onClick={onToggle}
          sx={{
            flex: 1,
            minWidth: 0,
            color: CURRICULUM_COURSE_BLUE,
            fontSize: '0.9375rem',
            fontWeight: 400,
            lineHeight: 1.5,
            cursor: 'pointer',
            pt: 0.15,
          }}
        >
          {headline}
        </Typography>
      </Box>

      <CurriculumCourseModules row={row} expanded={expanded} nested />

      {!isLast ? <Divider sx={ROW_DIVIDER_SX} /> : null}
    </Box>
  );
}

function CurriculumCourseRow({ row, expanded, onToggle, isLast }) {
  const headline = formatCourseWithModuleCount(row.courseTitle, row.modulesCount);

  return (
    <Box
      component={m.div}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: `${TOGGLE_GAP}px` }}>
          <ExpandToggle
            expanded={expanded}
            onToggle={onToggle}
            label={expanded ? 'Collapse modules' : 'Expand modules'}
          />
          <Typography
            variant="body1"
            onClick={onToggle}
            sx={{
              flex: 1,
              color: CURRICULUM_RED,
              fontWeight: 500,
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            {headline}
          </Typography>
        </Box>

        <Box sx={{ pl: `${NESTED_INDENT}px` }}>
          <CurriculumCourseModules row={row} expanded={expanded} />
        </Box>
      </Box>

      {!isLast ? <Divider sx={ROW_DIVIDER_SX} /> : null}
    </Box>
  );
}

function CurriculumCategoryRow({
  row,
  expanded,
  onToggle,
  expandedCourses,
  onToggleCourse,
  isLast,
}) {
  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: `${TOGGLE_GAP}px` }}>
        <ExpandToggle
          expanded={expanded}
          onToggle={onToggle}
          label={expanded ? 'Collapse category' : 'Expand category'}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body1"
            onClick={onToggle}
            sx={{
              color: CURRICULUM_RED,
              fontWeight: 600,
              fontSize: '1rem',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            {row.categoryTitle}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mt: 0.25, color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {formatCoursesCountLabel(row.coursesCount)}
          </Typography>
        </Box>
      </Box>

      <Collapse in={expanded} unmountOnExit={false}>
        <Box
          sx={{
            position: 'relative',
            mt: 1,
            pl: `${NESTED_INDENT}px`,
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 11,
              top: 0,
              bottom: 12,
              width: '1px',
              bgcolor: 'grey.300',
            },
          }}
        >
          {row.courses.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontStyle: 'italic', py: 1 }}
            >
              No courses in this category
            </Typography>
          ) : (
            row.courses.map((courseRow, courseIndex) => {
              const courseKey = `${row.categoryId}:${courseRow.courseId}`;
              const isLastCourse = courseIndex === row.courses.length - 1;

              return (
                <NestedCourseRow
                  key={courseKey}
                  row={courseRow}
                  expanded={expandedCourses.has(courseKey)}
                  onToggle={() => onToggleCourse(courseKey, row.categoryId)}
                  isLast={isLastCourse}
                />
              );
            })
          )}
        </Box>
      </Collapse>

      {!isLast ? <Divider sx={ROW_DIVIDER_SX} /> : null}
    </Box>
  );
}

function CurriculumListGrid({ children }) {
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
      {children}
    </Grid>
  );
}

function pruneExpandedCategories(prev, categoryRows) {
  const validIds = new Set(categoryRows.map((row) => row.categoryId));
  const next = new Set();
  prev.forEach((id) => {
    if (validIds.has(id)) next.add(id);
  });
  return next;
}

function pruneExpandedCourses(prev, categoryRows) {
  const validKeys = new Set();
  categoryRows.forEach((row) => {
    row.courses.forEach((course) => {
      validKeys.add(`${row.categoryId}:${course.courseId}`);
    });
  });
  const next = new Set();
  prev.forEach((key) => {
    if (validKeys.has(key)) next.add(key);
  });
  return next;
}

function CurriculumCategoryList({ categories = [], modules = [], categoryIds = [] }) {
  const [expandedCategories, setExpandedCategories] = useState(() => new Set());
  const [expandedCourses, setExpandedCourses] = useState(() => new Set());

  const categoryRows = useMemo(
    () => buildCurriculumCategoryRows(categories, modules, categoryIds),
    [categories, modules, categoryIds]
  );

  useEffect(() => {
    setExpandedCategories((prev) => pruneExpandedCategories(prev, categoryRows));
    setExpandedCourses((prev) => pruneExpandedCourses(prev, categoryRows));
  }, [categoryRows]);

  const handleToggleCategory = (categoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const handleToggleCourse = (courseKey, categoryId) => {
    setExpandedCategories((prev) => {
      if (prev.has(categoryId)) return prev;
      const next = new Set(prev);
      next.add(categoryId);
      return next;
    });

    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseKey)) next.delete(courseKey);
      else next.add(courseKey);
      return next;
    });
  };

  return (
    <Stack spacing={0} sx={{ width: 1 }}>
      {categoryRows.map((row, index) => (
        <CurriculumCategoryRow
          key={row.categoryId}
          row={row}
          expanded={expandedCategories.has(row.categoryId)}
          onToggle={() => handleToggleCategory(row.categoryId)}
          expandedCourses={expandedCourses}
          onToggleCourse={handleToggleCourse}
          isLast={index === categoryRows.length - 1}
        />
      ))}
    </Stack>
  );
}

function CurriculumCourseList({ modules = [], courses = [], courseIds = [] }) {
  const [expandedCourses, setExpandedCourses] = useState(() => new Set());

  const curriculumRows = useMemo(
    () => buildCurriculumRows(courses, modules, courseIds),
    [courses, modules, courseIds]
  );

  useEffect(() => {
    const validIds = new Set(curriculumRows.map((row) => row.courseId));
    setExpandedCourses((prev) => {
      const next = new Set();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [curriculumRows]);

  const handleToggleCourse = (courseId) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

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
          expanded={expandedCourses.has(rowKey)}
          onToggle={() => handleToggleCourse(rowKey)}
          isLast={isLastInColumn}
        />
      );
    });

  return (
    <CurriculumListGrid>
      <Grid item xs={12} md={6}>
        {renderColumn(leftColumn)}
      </Grid>
      <Grid item xs={12} md={6}>
        {renderColumn(rightColumn)}
      </Grid>
    </CurriculumListGrid>
  );
}

export function CurriculumModulesList({
  modules = [],
  courses = [],
  courseIds = [],
  categories = [],
  categoryIds = [],
}) {
  const useCategories = Array.isArray(categories) && categories.length > 0;

  if (useCategories) {
    return (
      <CurriculumCategoryList
        categories={categories}
        modules={modules}
        categoryIds={categoryIds}
      />
    );
  }

  return <CurriculumCourseList modules={modules} courses={courses} courseIds={courseIds} />;
}
