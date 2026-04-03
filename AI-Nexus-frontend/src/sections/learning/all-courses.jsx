import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { LoadingScreen } from 'src/components/loading-screen';
import { DashboardContent } from 'src/layouts/dashboard';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useAuthContext } from 'src/auth/hooks';
import { courseService } from 'src/services/course.service';
import { toast } from 'src/components/snackbar';
import { useCheckoutContext } from 'src/sections/checkout/context';
import Pagination, { paginationClasses } from '@mui/material/Pagination';
import { Divider } from '@mui/material';
import { CoursesLoaderOverlay } from './components/courses-loader-overlay';
import { LearningBundlePill, LearningBundleRibbon } from './components/course-bundle-badge';

// ----------------------------------------------------------------------

const ROWS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 800;
const DEFAULT_COURSE_IMAGE = import.meta.env.VITE_DEFAULT_COURSE_IMAGE || '/assets/images/cover/cover-1.jpg';
const DEFAULT_PAGINATION = {
  page: 1,
  limit: ROWS_PER_PAGE,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

const transformCourse = (course) => ({
  id: course.id,
  title: course.title || 'Untitled Course',
  description: course.description || '',
  image: course.image || DEFAULT_COURSE_IMAGE,
  freeOrPaid: course.freeOrPaid,
  amount: course.amount,
  level: course.level || 'Beginner',
  isFavorite: course.isFavorite ?? false,
  isBundle: course.isBundle ?? false,
  bundleCourseIds: Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds : [],
  isEnrolled: course.isEnrolled ?? false,
  accessViaBundle: course.accessViaBundle ?? false,
});

const LEVEL_SECTIONS = ['Beginner', 'Intermediate', 'Advance'];

const getLevelSection = (level) => {
  const normalizedLevel = String(level || '').toLowerCase();

  if (normalizedLevel.includes('intermediate')) {
    return 'Intermediate';
  }

  if (normalizedLevel.includes('advance') || normalizedLevel.includes('advanced')) {
    return 'Advance';
  }

  return 'Beginner';
};

export function AllCourses() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { authenticated } = useAuthContext();
  const checkout = useCheckoutContext();
  const latestRequestRef = useRef(0);
  const querySignatureRef = useRef('');

  const isInCart = (id) => checkout.items.some((item) => item.id === id);
  const addCourseToCart = (course) => {
    checkout.onAddToCart({
      id: course.id,
      name: course.title,
      coverUrl: course.image || '',
      price: Number(course.amount) || 0,
      quantity: 1,
    });
  };

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [groupPages, setGroupPages] = useState({ beginner: 1, intermediate: 1, advance: 1 });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState(null); // null | 'free' | 'paid' | 'purchased' | 'favorites'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [courses, setCourses] = useState([]);
  const [groupedResult, setGroupedResult] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginatingGroupKey, setPaginatingGroupKey] = useState(null);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [favorites, setFavorites] = useState(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState(new Set());
  const enrolledCourseIds = useMemo(
    () => new Set(courses.filter((course) => course.isEnrolled).map((course) => course.id)),
    [courses]
  );
  const isEnrolled = (id) => enrolledCourseIds.has(id);
  const getCourseDetailsPath = (id) => paths.learningCourse.details(id);
  const getCourseLearnPath = (id) => paths.learningCourse.learn(id);

  const handleCourseImageClick = (event, course) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(
      isEnrolled(course.id) ? getCourseLearnPath(course.id) : getCourseDetailsPath(course.id)
    );
  };

  const handleGoToDetails = (event, courseId) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(getCourseDetailsPath(courseId));
  };

  const handleAddToCartClick = (event, course) => {
    event.preventDefault();
    event.stopPropagation();

    if (isEnrolled(course.id)) return;

    if (!isInCart(course.id)) {
      addCourseToCart(course);
      toast.success('Added to cart');
    }

    navigate(paths.product.checkout);
  };

  const activeFilterCount = (courseFilter ? 1 : 0) + (debouncedSearchQuery ? 1 : 0);
  const selectedFilterLabel =
    courseFilter === 'free'
      ? 'Free'
      : courseFilter === 'paid'
        ? 'Paid'
        : courseFilter === 'purchased'
          ? 'Purchased'
          : courseFilter === 'favorites'
            ? 'Favorites'
            : null;
  const filterOptions = [
    { value: 'free', label: 'Free', description: 'Free courses only' },
    { value: 'paid', label: 'Paid', description: 'Paid courses only' },
    ...(authenticated
      ? [
          { value: 'purchased', label: 'Purchased', description: 'Courses you enrolled in' },
          { value: 'favorites', label: 'Favorites', description: 'Your favorite courses' },
        ]
      : []),
  ];

  useEffect(() => {
    if (!authenticated) {
      setCourseFilter((prev) => (prev === 'purchased' || prev === 'favorites' ? null : prev));
    }
  }, [authenticated]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const fetchCoursesPage = useCallback(
    async () => {
      const nextRequestId = latestRequestRef.current + 1;
      latestRequestRef.current = nextRequestId;
      setLoading(true);

      const params = {
        beginnerPage: groupPages.beginner,
        beginnerLimit: ROWS_PER_PAGE,
        intermediatePage: groupPages.intermediate,
        intermediateLimit: ROWS_PER_PAGE,
        advancePage: groupPages.advance,
        advanceLimit: ROWS_PER_PAGE,
        search: debouncedSearchQuery || undefined,
      };

      if (courseFilter === 'free') {
        params.freeOrPaid = false;
      } else if (courseFilter === 'paid') {
        params.freeOrPaid = true;
      } else if (courseFilter === 'favorites') {
        params.isFavorite = true;
      } else if (courseFilter === 'purchased') {
        params.isEnrolled = true;
      }

      try {
        const groupedResponse = await courseService.getGroupedCourses(params);
        if (nextRequestId !== latestRequestRef.current) {
          return;
        }

        setGroupedResult(groupedResponse);
        const nextCourses = groupedResponse.flatMap((group) => group.items || []);
        const totalItems = groupedResponse.reduce(
          (sum, group) => sum + (group.pagination?.totalItems || 0),
          0
        );
        const nextPagination = {
          page: 1,
          limit: ROWS_PER_PAGE,
          totalItems,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        };

        setCourses(nextCourses);
        setPagination(nextPagination);
        setFavorites(
          new Set(
            nextCourses
              .filter((course) => course.isFavorite === true || course.isFavorite === 'true')
              .map((course) => course.id)
          )
        );
      } catch (error) {
        if (nextRequestId === latestRequestRef.current) {
          toast.error(error?.response?.data?.message || 'Failed to fetch courses');
          setCourses([]);
          setGroupedResult([]);
          setPagination(DEFAULT_PAGINATION);
          setFavorites(new Set());
        }
      } finally {
        if (nextRequestId === latestRequestRef.current) {
          setLoading(false);
          setPaginatingGroupKey(null);
        }
      }
    },
    [courseFilter, debouncedSearchQuery, groupPages]
  );

  const handleGroupPageChange = useCallback((groupKey, value) => {
    setPaginatingGroupKey(groupKey);
    setGroupPages((prev) => ({ ...prev, [groupKey]: value }));
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setFavorites(new Set());
    }

    const filterSignature = `${courseFilter || 'all'}|${debouncedSearchQuery}|${authenticated ? 'auth' : 'guest'}`;

    if (querySignatureRef.current !== filterSignature) {
      querySignatureRef.current = filterSignature;
      setGroupPages({ beginner: 1, intermediate: 1, advance: 1 });
      return;
    }

    fetchCoursesPage();
  }, [authenticated, courseFilter, debouncedSearchQuery, fetchCoursesPage]);

  const displayCourses = useMemo(() => courses.map(transformCourse), [courses]);
  const groupedCourses = useMemo(
    () =>
      (groupedResult || []).map((group) => ({
        level: group.groupName,
        groupKey:
          group.groupName?.toLowerCase() === 'beginner' ||
          group.groupName?.toLowerCase() === 'basic'
            ? 'beginner'
            : group.groupName?.toLowerCase() === 'intermediate'
              ? 'intermediate'
              : 'advance',
        items: group.items || [],
        pagination: group.pagination || DEFAULT_PAGINATION,
      })),
    [groupedResult]
  );
  const totalCount = pagination.totalItems || 0;
  const displayedCourses = displayCourses;

  const handleRefresh = () => {
    fetchCoursesPage();
  };

  const handleClearFilters = () => {
    setCourseFilter(null);
    setSearchQuery('');
  };

  const renderFiltersContent = (isMobile = false) => (
    <Stack spacing={2}>
      {isMobile && (
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Course Filters
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {activeFilterCount > 0
                ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                : 'Use filters to refine courses'}
            </Typography>
          </Box>
          <IconButton onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters">
            <Iconify icon="solar:close-circle-bold" width={22} />
          </IconButton>
        </Stack>
      )}

      {!isMobile && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Course Filters
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            {activeFilterCount > 0
              ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
              : 'Use filters to refine courses'}
          </Typography>
        </Box>
      )}

      {!isMobile && (
        <>
          <Box
            sx={{
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: 14,
                transform: 'translateY(-50%)',
                color: 'text.disabled',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Iconify icon="solar:magnifer-linear" width={20} />
            </Box>
            <InputBase
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              sx={{
                width: '100%',
                height: 46,
                pl: 5,
                pr: searchQuery ? 6 : 2,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
                bgcolor: 'background.paper',
              }}
            />
            {searchQuery && (
              <IconButton
                size="small"
                onClick={() => setSearchQuery('')}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  right: 8,
                  transform: 'translateY(-50%)',
                  color: 'text.secondary',
                }}
              >
                <Iconify icon="solar:close-circle-bold" width={18} />
              </IconButton>
            )}
          </Box>

          {debouncedSearchQuery && (
            <Chip
              size="small"
              label={`Search: ${debouncedSearchQuery}`}
              onDelete={() => setSearchQuery('')}
              color="primary"
              variant="soft"
              sx={{ width: 'fit-content', fontWeight: 600 }}
            />
          )}
        </>
      )}

      <Stack spacing={1}>
        {filterOptions.map((filter) => {
          const active = courseFilter === filter.value;

          return (
            <Button
              key={filter.value}
              fullWidth
              onClick={() => {
                setCourseFilter(active ? null : filter.value);
                if (isMobile) {
                  setMobileFiltersOpen(false);
                }
              }}
              variant={active ? 'contained' : 'text'}
              color={active ? 'primary' : 'secondary'}
              sx={{
                justifyContent: 'flex-start',
                px: 1.5,
                py: 1.25,
                borderRadius: 1.5,
                textTransform: 'none',
                ...(active
                  ? {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    }
                  : {
                      color: 'secondary.main',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.secondary.main, 0.08),
                      },
                    }),
              }}
            >
              <Stack spacing={0.25} sx={{ alignItems: 'flex-start' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'inherit' }}>
                  {filter.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: active ? alpha(theme.palette.common.white, 0.8) : 'text.secondary',
                  }}
                >
                  {filter.description}
                </Typography>
              </Stack>
            </Button>
          );
        })}
      </Stack>

      {courseFilter && (
        <Chip
          size="small"
          label={selectedFilterLabel}
          onDelete={() => setCourseFilter(null)}
          color="primary"
          variant="soft"
          sx={{ width: 'fit-content', fontWeight: 600 }}
        />
      )}

      {(courseFilter || searchQuery) && (
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            handleClearFilters();
            if (isMobile) {
              setMobileFiltersOpen(false);
            }
          }}
          startIcon={<Iconify icon="solar:filter-bold" width={18} />}
          sx={{ textTransform: 'none' }}
        >
          Clear filters
        </Button>
      )}
    </Stack>
  );

  const handleFavorite = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authenticated) {
      toast.info('Please sign in to favorite courses');
      return;
    }

    // Optimistic update
    const wasFavorite = favorites.has(id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(id);
      else next.add(id);
      return next;
    });

    setFavoriteLoading((prev) => new Set(prev).add(id));

    try {
      const result = await courseService.toggleCourseFavorite(id);
      setCourses((prev) =>
        prev.filter((course) => !(course.id === id && courseFilter === 'favorites' && !result.isFavorite)).map((course) => (
          course.id === id ? { ...course, isFavorite: result.isFavorite } : course
        ))
      );
      setFavorites((prev) => {
        const next = new Set(prev);
        if (result.isFavorite) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
      toast.success(result.isFavorite ? 'Course added to favorites' : 'Course removed from favorites');
      fetchCoursesPage();
    } catch (error) {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(id);
        else next.delete(id);
        return next;
      });
      toast.error(error?.response?.data?.message || 'Failed to update favorite');
    } finally {
      setFavoriteLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (loading && courses.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          fontSize: { xs: '1.5rem', md: '1.75rem' },
          mb: 3,
        }}
      >
        Courses
      </Typography>

      <Grid container spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
        <Grid xs={12} md={3} lg={2.8} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Card
            sx={{
              p: 2,
              top: { md: 96 },
              position: { md: 'sticky' },
              boxShadow: theme.customShadows.z4,
            }}
          >
            {renderFiltersContent()}
          </Card>
        </Grid>

        <Grid xs={12} md={9} lg={9.2}>
          <Box
            sx={{
              display: { xs: 'block', md: 'none' },
              mb: 2,
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: 14,
                transform: 'translateY(-50%)',
                color: 'text.disabled',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Iconify icon="solar:magnifer-linear" width={20} />
            </Box>
            <InputBase
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              sx={{
                width: '100%',
                height: 46,
                pl: 5,
                pr: searchQuery ? 6 : 2,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
                bgcolor: 'background.paper',
              }}
            />
            {searchQuery && (
              <IconButton
                size="small"
                onClick={() => setSearchQuery('')}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  right: 8,
                  transform: 'translateY(-50%)',
                  color: 'text.secondary',
                }}
              >
                <Iconify icon="solar:close-circle-bold" width={18} />
              </IconButton>
            )}
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {totalCount === 0 ? 'No results' : `${totalCount} total results`}
            </Typography>

            <Stack direction="row" spacing={0.75} alignItems="center">
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<Iconify icon="solar:filter-bold" width={18} />}
                onClick={() => setMobileFiltersOpen(true)}
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  textTransform: 'none',
                }}
              >
                Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </Button>
              <Stack direction="row" spacing={0.25}>
                <IconButton
                  size="small"
                  onClick={() => setViewMode('list')}
                  sx={{
                    bgcolor: viewMode === 'list' ? alpha(theme.palette.info.main, 0.16) : 'transparent',
                    color: viewMode === 'list' ? 'info.main' : 'text.secondary',
                  }}
                  aria-label="List view"
                >
                  <Iconify icon="solar:list-bold" width={20} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setViewMode('grid')}
                  sx={{
                    bgcolor: viewMode === 'grid' ? alpha(theme.palette.info.main, 0.16) : 'transparent',
                    color: viewMode === 'grid' ? 'info.main' : 'text.secondary',
                  }}
                  aria-label="Grid view"
                >
                  <Iconify icon="solar:widget-5-bold" width={20} />
                </IconButton>
              </Stack>
              <IconButton
                size="small"
                onClick={handleRefresh}
                aria-label="Refresh"
                sx={{ color: 'text.secondary' }}
              >
                <Iconify icon="solar:refresh-bold" width={20} />
              </IconButton>
            </Stack>
          </Stack>

          {displayCourses.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Iconify
                icon="solar:book-bold"
                width={64}
                sx={{ color: 'text.disabled', mx: 'auto', mb: 2 }}
              />
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                No courses available
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {courseFilter || debouncedSearchQuery
                  ? 'No courses match the current search or filter. Try clearing them or choosing a different option.'
                  : 'Check back later for new courses.'}
              </Typography>
              {(courseFilter || searchQuery) && (
                <Button
                  variant="soft"
                  color="primary"
                  onClick={() => {
                    setCourseFilter(null);
                    setSearchQuery('');
                  }}
                  startIcon={<Iconify icon="solar:filter-bold" width={18} />}
                >
                  Clear search and filters
                </Button>
              )}
            </Box>
          ) : (
            <Box sx={{ position: 'relative' }}>
            <>
              {viewMode === 'grid' &&
                groupedCourses.map((group) => (
                  <Box key={group.level} sx={{ mb: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.75 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          color:
                            loading && paginatingGroupKey === group.groupKey
                              ? 'secondary.main'
                              : 'text.primary',
                          letterSpacing: 0.2,
                          fontSize: { xs: '1.08rem', md: '1.2rem' },
                        }}
                      >
                        {group.level}
                      </Typography>
                      <Divider
                        sx={{
                          flexGrow: 1,
                          height: 2,
                          border: 0,
                          borderRadius: 999,
                          bgcolor: 'transparent',
                          background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.7)} 0%, ${alpha(theme.palette.primary.main, 0.18)} 100%)`,
                        }}
                      />
                    </Stack>
                    <Box sx={{ position: 'relative' }}>
                      <Grid
                        container
                        spacing={{ xs: 2, md: 2.5 }}
                        columns={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
                      >
                        {group.items.map((course) => (
                        <Grid
                          key={course.id}
                          xs={1}
                        >
                          <Card
                            sx={{
                              height: '100%',
                              minHeight: 250,
                              display: 'flex',
                              flexDirection: 'column',
                              borderRadius: 2,
                              boxShadow: theme.customShadows.z4,
                              overflow: 'hidden',
                              textDecoration: 'none',
                              color: 'inherit',
                              transition: 'box-shadow 0.25s ease',
                              '&:hover': { boxShadow: theme.customShadows.z16 },
                            }}
                          >
                            <Box
                              onClick={(e) => handleCourseImageClick(e, course)}
                              sx={{
                                position: 'relative',
                                height: { xs: 150, sm: 165, md: 155, lg: 145 },
                                bgcolor: 'grey.100',
                                flexShrink: 0,
                                cursor: 'pointer',
                              }}
                            >
                              <Image
                                alt={course.title}
                                src={course.image || DEFAULT_COURSE_IMAGE}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'block',
                                  objectFit: 'cover',
                                }}
                                onError={(e) => {
                                  e.target.src = DEFAULT_COURSE_IMAGE;
                                }}
                              />
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: alpha(theme.palette.common.black, 0.2),
                                  opacity: 0,
                                  transition: 'opacity 0.2s',
                                  '&:hover': { opacity: 1 },
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    bgcolor: alpha(theme.palette.common.white, 0.9),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Iconify icon="solar:play-bold" width={24} sx={{ color: 'primary.main', ml: 0.25 }} />
                                </Box>
                              </Box>
                              {course.isBundle && (
                                <LearningBundleRibbon
                                  count={Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds.length : 0}
                                />
                              )}
                              <IconButton
                                size="small"
                                onClick={(e) => handleFavorite(e, course.id)}
                                disabled={favoriteLoading.has(course.id)}
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  bgcolor: alpha(theme.palette.common.white, 0.98),
                                  color: (favorites.has(course.id) || course.isFavorite) ? 'error.main' : 'grey.600',
                                  boxShadow: theme.shadows[6],
                                  border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
                                  '&:hover': { bgcolor: 'common.white' },
                                  opacity: favoriteLoading.has(course.id) ? 0.6 : 1,
                                }}
                                aria-label="Favorite"
                              >
                                <Iconify
                                  icon={(favorites.has(course.id) || course.isFavorite) ? 'solar:heart-bold' : 'solar:heart-outline'}
                                  width={22}
                                />
                              </IconButton>
                            </Box>
                            <Box
                              sx={{
                                p: 1.5,
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                minHeight: 96,
                              }}
                            >
                              <Typography
                                variant="body1"
                                component={RouterLink}
                                to={getCourseDetailsPath(course.id)}
                                sx={{
                                  fontWeight: 500,
                                  fontSize: { xs: '1rem', md: '0.98rem' },
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: 1.4,
                                  mb: 0.75,
                                  height: '2.8em',
                                  wordBreak: 'break-word',
                                  color: 'inherit',
                                  textDecoration: 'none',
                                }}
                              >
                                {course.title}
                              </Typography>
                              {course.isBundle && (
                                <LearningBundlePill
                                  count={Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds.length : 0}
                                  sx={{ mb: 0.75 }}
                                />
                              )}
                              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: course.freeOrPaid
                                        ? isEnrolled(course.id)
                                          ? 'text.disabled'
                                          : 'secondary.main'
                                        : 'success.main',
                                      fontWeight: 500,
                                      display: 'block',
                                      fontSize: { xs: '0.82rem', md: '0.85rem' },
                                      textDecoration:
                                        course.freeOrPaid && isEnrolled(course.id) ? 'line-through' : 'none',
                                    }}
                                  >
                                    {course.freeOrPaid ? `${Number(course.amount || 0).toFixed(2)} SGD` : 'Free'}
                                  </Typography>
                                  {course.freeOrPaid && isEnrolled(course.id) && (
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      <Iconify
                                        icon="solar:verified-check-bold"
                                        width={14}
                                        sx={{ color: 'success.main' }}
                                      />
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: 'success.main',
                                          fontWeight: 600,
                                          fontSize: { xs: '0.78rem', md: '0.82rem' },
                                        }}
                                      >
                                        {course.accessViaBundle ? 'Included in bundle' : 'Purchased'}
                                      </Typography>
                                    </Stack>
                                  )}
                                </Stack>
                                {(course.freeOrPaid || isEnrolled(course.id) || isInCart(course.id)) && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleAddToCartClick(e, course)}
                                    disabled={isEnrolled(course.id)}
                                    sx={{
                                      flexShrink: 0,
                                      bgcolor: isEnrolled(course.id)
                                        ? 'common.white'
                                        : isInCart(course.id)
                                          ? 'primary.main'
                                          : 'warning.main',
                                      color: isEnrolled(course.id) || isInCart(course.id)
                                        ? isEnrolled(course.id)
                                          ? 'success.main'
                                          : 'primary.contrastText'
                                        : 'warning.contrastText',
                                      boxShadow: theme.shadows[4],
                                      border: `1px solid ${
                                        isEnrolled(course.id)
                                          ? alpha(theme.palette.success.main, 0.45)
                                          : isInCart(course.id)
                                            ? alpha(theme.palette.primary.main, 0.4)
                                            : alpha(theme.palette.common.white, 0.24)
                                      }`,
                                      '&:hover': {
                                        bgcolor: isEnrolled(course.id)
                                          ? alpha(theme.palette.success.main, 0.08)
                                          : isInCart(course.id)
                                            ? 'primary.dark'
                                            : 'warning.dark',
                                      },
                                      opacity: isEnrolled(course.id) ? 0.9 : 1,
                                      ...(isEnrolled(course.id) && {
                                        borderRadius: '50%',
                                        animation: 'verifiedRing 2s ease-in-out infinite',
                                        '@keyframes verifiedRing': {
                                          '0%, 100%': {
                                            boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.22)}`,
                                          },
                                          '50%': {
                                            boxShadow: `0 0 0 8px ${alpha(theme.palette.success.main, 0)}`,
                                          },
                                        },
                                      }),
                                    }}
                                    aria-label={isEnrolled(course.id) ? 'Purchased' : 'Add to cart'}
                                  >
                                    <Iconify
                                      icon={
                                        isEnrolled(course.id)
                                          ? 'solar:verified-check-bold'
                                          : isInCart(course.id)
                                            ? 'solar:cart-check-bold'
                                            : 'solar:cart-plus-bold'
                                      }
                                      width={20}
                                      sx={
                                        isEnrolled(course.id) || isInCart(course.id)
                                          ? {
                                              color: isEnrolled(course.id) ? 'success.main' : 'primary.contrastText',
                                            }
                                          : undefined
                                      }
                                    />
                                  </IconButton>
                                )}
                              </Stack>
                            </Box>
                          </Card>
                        </Grid>
                        ))}
                      </Grid>
                      {loading && paginatingGroupKey === group.groupKey && (
                        <CoursesLoaderOverlay size={32} zIndex={2} />
                      )}
                    </Box>
                    {(group.pagination?.totalPages || 0) > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Pagination
                          count={Math.max(1, group.pagination.totalPages || 1)}
                          page={groupPages[group.groupKey] || 1}
                          onChange={(_, value) => handleGroupPageChange(group.groupKey, value)}
                          disabled={loading && paginatingGroupKey === group.groupKey}
                          color="primary"
                          shape="rounded"
                          showFirstButton
                          showLastButton
                          sx={{ [`& .${paginationClasses.ul}`]: { justifyContent: 'flex-end' } }}
                        />
                      </Box>
                    )}
                  </Box>
                ))}

      {viewMode === 'list' && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {groupedCourses.map((group) => (
            <Box key={group.level}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.75 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    color:
                      loading && paginatingGroupKey === group.groupKey
                        ? 'secondary.main'
                        : 'text.primary',
                    letterSpacing: 0.2,
                    fontSize: { xs: '1.08rem', md: '1.2rem' },
                  }}
                >
                  {group.level}
                </Typography>
                <Divider
                  sx={{
                    flexGrow: 1,
                    height: 2,
                    border: 0,
                    borderRadius: 999,
                    bgcolor: 'transparent',
                    background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.7)} 0%, ${alpha(theme.palette.primary.main, 0.18)} 100%)`,
                  }}
                />
              </Stack>
              <Box sx={{ position: 'relative' }}>
                <Stack spacing={2}>
                  {group.items.map((course) => (
                  <Card
                    key={course.id}
                    sx={{
                      minHeight: 190,
                      display: 'flex',
                      flexDirection: 'row',
                      borderRadius: 2,
                      boxShadow: theme.customShadows.z4,
                      overflow: 'hidden',
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': { boxShadow: theme.customShadows.z16 },
                    }}
                  >
                    <Box
                      onClick={(e) => handleCourseImageClick(e, course)}
                      sx={{
                        width: { xs: 120, sm: 220, md: 240 },
                        flexShrink: 0,
                        position: 'relative',
                        height: { xs: 190, sm: 190, md: 190 },
                        alignSelf: 'stretch',
                        bgcolor: 'grey.100',
                        cursor: 'pointer',
                      }}
                    >
                      <Image
                        alt={course.title}
                        src={course.image || DEFAULT_COURSE_IMAGE}
                        sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = DEFAULT_COURSE_IMAGE;
                        }}
                      />
                      {course.isBundle && (
                        <LearningBundleRibbon
                          count={Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds.length : 0}
                        />
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => handleFavorite(e, course.id)}
                        disabled={favoriteLoading.has(course.id)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: alpha(theme.palette.common.white, 0.98),
                          color: (favorites.has(course.id) || course.isFavorite) ? 'error.main' : 'grey.600',
                          boxShadow: theme.shadows[6],
                          border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
                          opacity: favoriteLoading.has(course.id) ? 0.6 : 1,
                        }}
                      >
                        <Iconify icon={(favorites.has(course.id) || course.isFavorite) ? 'solar:heart-bold' : 'solar:heart-outline'} width={22} />
                      </IconButton>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="body1"
                        component={RouterLink}
                        to={getCourseDetailsPath(course.id)}
                        sx={{
                          fontWeight: 500,
                          fontSize: { xs: '1rem', md: '1.05rem' },
                          lineHeight: 1.4,
                          mb: 0.75,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          height: '2.8em',
                          wordBreak: 'break-word',
                          color: 'inherit',
                          textDecoration: 'none',
                        }}
                      >
                        {course.title}
                      </Typography>
                      {course.isBundle && (
                        <LearningBundlePill
                          count={Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds.length : 0}
                          sx={{ mb: 1 }}
                        />
                      )}
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                          <Typography
                            variant="caption"
                            sx={{
                              color: course.freeOrPaid
                                ? isEnrolled(course.id)
                                  ? 'text.disabled'
                                  : 'secondary.main'
                                : 'success.main',
                              fontWeight: 500,
                              display: 'block',
                              fontSize: { xs: '0.82rem', md: '0.9rem' },
                              textDecoration:
                                course.freeOrPaid && isEnrolled(course.id) ? 'line-through' : 'none',
                            }}
                          >
                            {course.freeOrPaid ? `${Number(course.amount || 0).toFixed(2)} SGD` : 'Free'}
                          </Typography>
                          {course.freeOrPaid && isEnrolled(course.id) && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Iconify
                                icon="solar:verified-check-bold"
                                width={14}
                                sx={{ color: 'success.main' }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'success.main',
                                  fontWeight: 600,
                                  fontSize: { xs: '0.78rem', md: '0.85rem' },
                                }}
                              >
                                {course.accessViaBundle ? 'Included in bundle' : 'Purchased'}
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                        {(course.freeOrPaid || isEnrolled(course.id) || isInCart(course.id)) && (
                          <IconButton
                            size="small"
                            onClick={(e) => handleAddToCartClick(e, course)}
                            disabled={isEnrolled(course.id)}
                            sx={{
                              flexShrink: 0,
                              bgcolor: isEnrolled(course.id)
                                ? 'common.white'
                                : isInCart(course.id)
                                  ? 'primary.main'
                                  : 'warning.main',
                              color: isEnrolled(course.id) || isInCart(course.id)
                                ? isEnrolled(course.id)
                                  ? 'success.main'
                                  : 'primary.contrastText'
                                : 'warning.contrastText',
                              boxShadow: theme.shadows[4],
                              border: `1px solid ${
                                isEnrolled(course.id)
                                  ? alpha(theme.palette.success.main, 0.45)
                                  : isInCart(course.id)
                                    ? alpha(theme.palette.primary.main, 0.4)
                                    : alpha(theme.palette.common.white, 0.24)
                              }`,
                              '&:hover': {
                                bgcolor: isEnrolled(course.id)
                                  ? alpha(theme.palette.success.main, 0.08)
                                  : isInCart(course.id)
                                    ? 'primary.dark'
                                    : 'warning.dark',
                              },
                              opacity: isEnrolled(course.id) ? 0.9 : 1,
                              ...(isEnrolled(course.id) && {
                                borderRadius: '50%',
                                animation: 'verifiedRing 2s ease-in-out infinite',
                                '@keyframes verifiedRing': {
                                  '0%, 100%': {
                                    boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.22)}`,
                                  },
                                  '50%': {
                                    boxShadow: `0 0 0 8px ${alpha(theme.palette.success.main, 0)}`,
                                  },
                                },
                              }),
                            }}
                            aria-label={isEnrolled(course.id) ? 'Purchased' : 'Add to cart'}
                          >
                            <Iconify
                              icon={
                                isEnrolled(course.id)
                                  ? 'solar:verified-check-bold'
                                  : isInCart(course.id)
                                    ? 'solar:cart-check-bold'
                                    : 'solar:cart-plus-bold'
                              }
                              width={20}
                              sx={
                                isEnrolled(course.id) || isInCart(course.id)
                                  ? {
                                      color: isEnrolled(course.id) ? 'success.main' : 'primary.contrastText',
                                    }
                                  : undefined
                              }
                            />
                          </IconButton>
                        )}
                      </Stack>
                    </Box>
                  </Card>
                  ))}
                </Stack>
                {loading && paginatingGroupKey === group.groupKey && (
                  <CoursesLoaderOverlay size={32} zIndex={2} />
                )}
              </Box>
              {(group.pagination?.totalPages || 0) > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Pagination
                    count={Math.max(1, group.pagination.totalPages || 1)}
                    page={groupPages[group.groupKey] || 1}
                    onChange={(_, value) => handleGroupPageChange(group.groupKey, value)}
                    disabled={loading && paginatingGroupKey === group.groupKey}
                    color="primary"
                    shape="rounded"
                    showFirstButton
                    showLastButton
                    sx={{ [`& .${paginationClasses.ul}`]: { justifyContent: 'flex-end' } }}
                  />
                </Box>
              )}
            </Box>
          ))}
        </Stack>
      )}
            </>
            {loading && !paginatingGroupKey && (
              <CoursesLoaderOverlay top size={34} zIndex={3} />
            )}
            </Box>
          )}
        </Grid>
      </Grid>

      <Drawer
        anchor="right"
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 360 },
            p: 2.5,
          },
        }}
      >
        {renderFiltersContent(true)}
      </Drawer>
    </>
  );
}
