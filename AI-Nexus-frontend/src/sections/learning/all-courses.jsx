import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { LoadingScreen } from 'src/components/loading-screen';
import { DashboardContent } from 'src/layouts/dashboard';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useAuthContext } from 'src/auth/hooks';
import { courseService } from 'src/services/course.service';
import { appSettingsService } from 'src/services/app-settings.service';
import { toast } from 'src/components/snackbar';
import { useCheckoutContext } from 'src/sections/checkout/context';
import { ENV_DEFAULT_COURSE_IMAGE, getCourseDefaultImage } from 'src/utils/course-default-image';
import Pagination, { paginationClasses } from '@mui/material/Pagination';
import { Divider } from '@mui/material';
import { CoursesLoaderOverlay } from './components/courses-loader-overlay';
import { LearningBundlePill, LearningBundleRibbon } from './components/course-bundle-badge';
import { MembershipSignupDialog } from './components/membership-signup-dialog';
import { LearningGuestSignInPrompt } from './components/learning-guest-sign-in-prompt';
import {
  buildScaqAssociateOptInOAuthStartUrl,
  clearMembershipEligibilityDraftOnModalClose,
  clearMembershipEligibilitySessionStorage,
  POST_OAUTH_RETURN_TO_KEY,
} from 'src/utils/membership-eligibility-sso';

// ----------------------------------------------------------------------

const ROWS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 450;
const DEFAULT_PAGINATION = {
  page: 1,
  limit: ROWS_PER_PAGE,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

const transformCourse = (course, defaultCourseImage) => ({
  id: course.id,
  title: course.title || 'Untitled Course',
  description: course.description || '',
  image: course.image || defaultCourseImage,
  freeOrPaid: course.freeOrPaid,
  amount: course.amount,
  level: course.level || 'Beginner',
  isFavorite: course.isFavorite ?? false,
  isBundle: course.isBundle ?? false,
  bundleCourseIds: Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds : [],
  isRecommended: course.isRecommended ?? false,
  isEnrolled: course.isEnrolled ?? false,
  accessViaBundle: course.accessViaBundle ?? false,
  categoryId: course.categoryId || course.category?.id || null,
  category: course.category || null,
});

const getCourseContentMeta = (course = {}) => {
  const modulesCount = Number(course.modulesCount ?? course.moduleCount ?? 0);
  const sectionsCount = Number(course.sectionsCount ?? course.sectionCount ?? 0);

  return {
    moduleCount: Number.isFinite(modulesCount) && modulesCount > 0 ? modulesCount : 0,
    sectionCount: Number.isFinite(sectionsCount) && sectionsCount > 0 ? sectionsCount : 0,
  };
};

const getCourseProgressStatus = (status, courseProgress) => {
  if (status === 'completed' || courseProgress >= 100) return { label: 'Completed', color: 'success' };
  if (status === 'in_progress' || courseProgress > 0) return { label: 'In Progress', color: 'warning' };
  return { label: 'Not Started', color: 'default' };
};

const shouldShowTitleTooltip = (title) => String(title || '').trim().length > 42;

export function AllCourses({ refreshSignal = 0, enrolledOnly = false }) {
  const theme = useTheme();
  // const isDesktop = useMediaQuery(theme.breakpoints.up('md')); // filters UI disabled
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticated } = useAuthContext();
  const checkout = useCheckoutContext();
  const latestRequestRef = useRef(0);
  const querySignatureRef = useRef('');
  // const desktopFilterPanelRef = useRef(null); // filters UI disabled
  const groupPagesRef = useRef({ recommended: 1 });
  const skipNextFullFetchRef = useRef(false);

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
  /* Course filters / search UI temporarily disabled — uncomment useStates below to restore.
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true);
  const [isDesktopFilterPanelVisible, setIsDesktopFilterPanelVisible] = useState(true);
  const [showDesktopFloatingFilterButton, setShowDesktopFloatingFilterButton] = useState(false);
  */
  const [groupPages, setGroupPages] = useState({ recommended: 1 });
  /* const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopFiltersExpanded, setDesktopFiltersExpanded] = useState(true);
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(true);
  const [courseFilter, setCourseFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(''); */
  const courseFilter = null;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [courses, setCourses] = useState([]);
  const [defaultCourseImage, setDefaultCourseImage] = useState(() => {
    if (typeof window === 'undefined') return ENV_DEFAULT_COURSE_IMAGE;
    return getCourseDefaultImage();
  });
  const [groupedResult, setGroupedResult] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginatingGroupKey, setPaginatingGroupKey] = useState(null);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [favorites, setFavorites] = useState(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState(new Set());
  const [membershipSignupOpen, setMembershipSignupOpen] = useState(false);
  const [courseProgressById, setCourseProgressById] = useState({});
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
    if (!authenticated) {
      setMembershipSignupOpen(true);
      return;
    }

    if (!isInCart(course.id)) {
      addCourseToCart(course);
      toast.success('Added to cart');
      return;
    }
    toast.info('Already in cart');
  };

  /* Filters disabled — restore with filter UI
  const activeFilterCount = (courseFilter ? 1 : 0) + (debouncedSearchQuery ? 1 : 0);
  const selectedFilterLabel = ...
  const filterOptions = [ ... ];

  useEffect(() => {
    if (!authenticated) {
      setCourseFilter((prev) => (prev === 'purchased' || prev === 'favorites' ? null : prev));
    }
  }, [authenticated]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);
  */

  const resolveGroupKey = useCallback((group) => {
    if (group?.groupKey) return group.groupKey;
    const name = String(group?.groupName || '').toLowerCase();
    if (name === 'recommended') return 'recommended';
    return name.trim().replace(/[^a-z0-9]+/g, '-');
  }, []);

  const fetchCoursesPage = useCallback(
    async (options = {}) => {
      const { onlyGroupKey, pagesOverride } = options;
      const nextRequestId = latestRequestRef.current + 1;
      latestRequestRef.current = nextRequestId;
      if (!onlyGroupKey) {
        setLoading(true);
      }
      if (onlyGroupKey) {
        setPaginatingGroupKey(onlyGroupKey);
      }

      const pages = pagesOverride || groupPagesRef.current;

      const params = {
        search: debouncedSearchQuery || undefined,
      };
      if (onlyGroupKey) {
        params.group = onlyGroupKey;
        params.page = pages[onlyGroupKey] || 1;
        params.limit = ROWS_PER_PAGE;
      } else {
        params.page = 1;
        params.limit = ROWS_PER_PAGE;
      }

      /* Course filter query params — restore when re-enabling filters UI
      if (courseFilter === 'free') {
        params.freeOrPaid = false;
      } else if (courseFilter === 'paid') {
        params.freeOrPaid = true;
      } else if (courseFilter === 'favorites') {
        params.isFavorite = true;
      } else if (courseFilter === 'purchased') {
        params.isEnrolled = true;
      }
      */

      if (enrolledOnly && authenticated) {
        params.isEnrolled = true;
      }

      try {
        const groupedPayload = await courseService.getGroupedCourses(params);
        const groupedResponse = groupedPayload?.groups || [];
        if (nextRequestId !== latestRequestRef.current) {
          return;
        }

        if (onlyGroupKey) {
          setGroupedResult((prev) => {
            const incomingGroup = groupedResponse.find(
              (group) => resolveGroupKey(group) === onlyGroupKey
            );
            if (!incomingGroup) return prev;
            let merged = [...prev];
            const index = merged.findIndex((group) => resolveGroupKey(group) === onlyGroupKey);
            if (index >= 0) {
              merged[index] = incomingGroup;
            } else if (onlyGroupKey === 'recommended') {
              merged = [incomingGroup, ...merged];
            } else {
              merged.push(incomingGroup);
            }
            const recommended = merged.filter((group) => resolveGroupKey(group) === 'recommended');
            const others = merged.filter((group) => resolveGroupKey(group) !== 'recommended');
            merged = [...recommended, ...others];

            const nextCourses = merged.flatMap((group) => group.items || []);
            const totalItems = merged.reduce(
              (sum, group) => sum + (group.pagination?.totalItems || 0),
              0
            );
            setCourses(nextCourses);
            setPagination({
              page: 1,
              limit: ROWS_PER_PAGE,
              totalItems,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            });
            setFavorites(
              new Set(
                nextCourses
                  .filter((course) => course.isFavorite === true || course.isFavorite === 'true')
                  .map((course) => course.id)
              )
            );
            return merged;
          });
        } else {
          setGroupedResult(groupedResponse);
          const dynamicPages = groupedResponse.reduce((acc, group) => {
            const key = resolveGroupKey(group);
            if (key) acc[key] = 1;
            return acc;
          }, {});
          setGroupPages(dynamicPages);
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
        }
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
          if (!onlyGroupKey) {
            setLoading(false);
          }
          setPaginatingGroupKey(null);
        }
      }
    },
    [authenticated, debouncedSearchQuery, enrolledOnly, resolveGroupKey]
  );

  const handleGroupPageChange = useCallback(
    (groupKey, value) => {
      const nextPages = { ...groupPages, [groupKey]: value };
      skipNextFullFetchRef.current = true;
      setGroupPages(nextPages);
      fetchCoursesPage({ onlyGroupKey: groupKey, pagesOverride: nextPages });
    },
    [fetchCoursesPage, groupPages]
  );

  useEffect(() => {
    groupPagesRef.current = groupPages;
  }, [groupPages]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (!authenticated) {
      setFavorites(new Set());
    }

    const filterSignature = `${enrolledOnly ? 'my-courses' : 'all'}|${authenticated ? 'auth' : 'guest'}|${debouncedSearchQuery}`;

    if (querySignatureRef.current !== filterSignature) {
      querySignatureRef.current = filterSignature;
      const resetPages = { recommended: 1 };
      setGroupPages(resetPages);
      fetchCoursesPage({ pagesOverride: resetPages });
      return;
    }

    if (skipNextFullFetchRef.current) {
      skipNextFullFetchRef.current = false;
      return;
    }

    fetchCoursesPage();
  }, [authenticated, debouncedSearchQuery, enrolledOnly, fetchCoursesPage, refreshSignal]);

  useEffect(() => {
    let active = true;
    if (!authenticated) {
      setCourseProgressById({});
      return () => {
        active = false;
      };
    }
    const loadProgressOverview = async () => {
      try {
        const rows = await courseService.getMyProgressOverview();
        if (!active) return;
        const nextProgressMap = (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
          const courseId = row?.course?.id ? String(row.course.id) : '';
          if (!courseId) return acc;
          const progress = row?.progress && typeof row.progress === 'object' ? row.progress : {};
          acc[courseId] = {
            completionPercent: Math.max(0, Math.min(100, Number(progress.completionPercent ?? 0))),
            status: String(progress.status || '').toLowerCase(),
          };
          return acc;
        }, {});
        setCourseProgressById(nextProgressMap);
      } catch (_error) {
        if (active) setCourseProgressById({});
      }
    };
    loadProgressOverview();
    return () => {
      active = false;
    };
  }, [authenticated, refreshSignal]);

  /* Desktop filter panel visibility / floating filter button — restore with filters UI
  useEffect(() => { ... }, [desktopFiltersOpen, isDesktop]);
  useEffect(() => { ... }, [desktopFiltersOpen, isDesktop]);
  */

  const displayCourses = useMemo(
    () => courses.map((course) => transformCourse(course, defaultCourseImage)),
    [courses, defaultCourseImage]
  );

  useEffect(() => {
    let active = true;
    const loadCourseDefaultImage = async () => {
      try {
        const appSettings = await appSettingsService.getPublic();
        const next = appSettings?.courseDefaultImageUrl || ENV_DEFAULT_COURSE_IMAGE;
        if (!active) return;
        setDefaultCourseImage(next);
        if (typeof window !== 'undefined') {
          if (appSettings?.courseDefaultImageUrl) {
            window.localStorage.setItem('course-default-image-url', appSettings.courseDefaultImageUrl);
          } else {
            window.localStorage.removeItem('course-default-image-url');
          }
        }
      } catch (_error) {
        // keep existing fallback image when settings fetch fails
      }
    };
    loadCourseDefaultImage();
    return () => {
      active = false;
    };
  }, []);
  const groupedCourses = useMemo(
    () =>
      (groupedResult || [])
        .map((group) => ({
          level: group.groupName,
          groupKey: resolveGroupKey(group),
          items: group.items || [],
          pagination: group.pagination || DEFAULT_PAGINATION,
        }))
        .filter((group) => {
          const total = Number(group.pagination?.totalItems ?? 0);
          const itemCount = (group.items || []).length;
          return total > 0 && itemCount > 0;
        }),
    [groupedResult, resolveGroupKey]
  );
  const recommendedResultsCount = groupedCourses
    .filter((group) => group.groupKey === 'recommended')
    .reduce((sum, group) => sum + (group.pagination?.totalItems || 0), 0);
  const levelResultsCount = groupedCourses
    .filter((group) => group.groupKey !== 'recommended')
    .reduce((sum, group) => sum + (group.pagination?.totalItems || 0), 0);
  const totalCount = new Set(
    groupedCourses.flatMap((group) =>
      (group.items || []).map((course) => course.id).filter(Boolean)
    )
  ).size;
  const getCategoryTitle = useCallback(
    (course) => course?.category?.title || '',
    []
  );
  const displayedCourses = displayCourses;

  const handleRefresh = () => {
    fetchCoursesPage();
  };

  /* handleClearFilters + renderFiltersContent (sidebar / mobile drawer filters) — restore with filter useStates */

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
        prev
          .filter(
            (course) => !(course.id === id && courseFilter === 'favorites' && !result.isFavorite)
          )
          .map((course) =>
            course.id === id ? { ...course, isFavorite: result.isFavorite } : course
          )
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
      toast.success(
        result.isFavorite ? 'Course added to favorites' : 'Course removed from favorites'
      );
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

  if (enrolledOnly && !authenticated) {
    return <LearningGuestSignInPrompt variant="myCourses" />;
  }

  if (loading && courses.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Grid container spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
        {/* Desktop filter column — restore with renderFiltersContent
        {desktopFiltersOpen && (
          <Grid xs={12} md={3} lg={2.8} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Card ref={desktopFilterPanelRef} sx={{ p: 2, top: { md: 96 }, position: { md: 'sticky' }, boxShadow: theme.customShadows.z4 }}>
              {renderFiltersContent()}
            </Card>
          </Grid>
        )}
        */}

        <Grid xs={12} md={12} lg={12}>
          {/* Mobile search bar — restore with filters
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2, position: 'relative' }}>
            ...
          </Box>
          */}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', flex: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {enrolledOnly
                  ? totalCount === 0
                    ? 'No purchased courses yet'
                    : `${totalCount} purchased course${totalCount === 1 ? '' : 's'}`
                  : totalCount === 0
                    ? 'No results'
                    : `${totalCount} total results`}
              </Typography>
              {!enrolledOnly ? (
                <>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Recommended: {recommendedResultsCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Category groups: {levelResultsCount}
                  </Typography>
                </>
              ) : null}
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={0.75}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                sx={{ justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}
              >
              {/* Filters toggle — restore with desktopFiltersOpen / mobileFiltersOpen
              <Button variant="outlined" color="secondary" startIcon={<Iconify icon="solar:filter-bold" width={18} />} ...>
                ...
              </Button>
              */}
              <Stack direction="row" spacing={0.25}>
                <IconButton
                  size="small"
                  onClick={() => setViewMode('list')}
                  sx={{
                    bgcolor:
                      viewMode === 'list' ? alpha(theme.palette.info.main, 0.16) : 'transparent',
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
                    bgcolor:
                      viewMode === 'grid' ? alpha(theme.palette.info.main, 0.16) : 'transparent',
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
              <TextField
                size="small"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                sx={{ minWidth: { xs: '100%', sm: 300 }, maxWidth: { sm: 380 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="solar:magnifer-linear" width={18} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                      >
                        <Iconify icon="mingcute:close-line" width={16} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
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
              {/* Clear search/filters — restore with filter state setters
              {(courseFilter || searchQuery) && (
                <Button variant="soft" color="primary" onClick={() => { setCourseFilter(null); setSearchQuery(''); }} ...>
                  Clear search and filters
                </Button>
              )}
              */}
            </Box>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <>
                {viewMode === 'grid' &&
                  groupedCourses.map((group) => (
                    <Box key={group.groupKey || group.level} sx={{ mb: 3 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.75 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            color:
                              paginatingGroupKey === group.groupKey
                                ? 'secondary.main'
                                : 'text.primary',
                            letterSpacing: 0.2,
                            fontSize: { xs: '1.08rem', md: '1.2rem' },
                          }}
                        >
                          {group.level} ({group.pagination?.totalItems || 0})
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
                          columns={{ xs: 2, sm: 3, md: 3, lg: 4, xl: 5 }}
                        >
                          {group.items.map((course) => {
                            const { moduleCount, sectionCount } = getCourseContentMeta(course);
                            const progressRow = courseProgressById[course.id] || {};
                            const courseProgress = Number.isFinite(progressRow.completionPercent)
                              ? progressRow.completionPercent
                              : 0;
                            const showCourseProgress = authenticated && (!course.freeOrPaid || isEnrolled(course.id));
                            const progressStatus = getCourseProgressStatus(progressRow.status, courseProgress);
                            return (
                              <Grid key={course.id} xs={1}>
                                <Card
                                  sx={{
                                    height: '100%',
                                    minHeight: { xs: 210, sm: 235, md: 250 },
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
                                      height: { xs: 112, sm: 150, md: 155, lg: 145 },
                                      bgcolor: 'grey.100',
                                      flexShrink: 0,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Image
                                      alt={course.title}
                                      src={course.image || defaultCourseImage}
                                      sx={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'block',
                                        objectFit: 'cover',
                                      }}
                                      onError={(e) => {
                                        e.target.src = defaultCourseImage;
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
                                        <Iconify
                                          icon="solar:play-bold"
                                          width={24}
                                          sx={{ color: 'primary.main', ml: 0.25 }}
                                        />
                                      </Box>
                                    </Box>
                                    {course.isBundle && (
                                      <LearningBundleRibbon
                                        count={
                                          Array.isArray(course.bundleCourseIds)
                                            ? course.bundleCourseIds.length
                                            : 0
                                        }
                                      />
                                    )}
                                    {group.groupKey !== 'recommended' && course.isRecommended && (
                                      <Chip
                                        size="small"
                                        label="Recommended"
                                        color="warning"
                                        sx={{
                                          position: 'absolute',
                                          top: 8,
                                          left: 8,
                                          height: 22,
                                          fontWeight: 700,
                                          zIndex: 2,
                                        }}
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
                                        color:
                                          favorites.has(course.id) || course.isFavorite
                                            ? 'error.main'
                                            : 'grey.600',
                                        boxShadow: theme.shadows[6],
                                        border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
                                        '&:hover': { bgcolor: 'common.white' },
                                        opacity: favoriteLoading.has(course.id) ? 0.6 : 1,
                                      }}
                                      aria-label="Favorite"
                                    >
                                      <Iconify
                                        icon={
                                          favorites.has(course.id) || course.isFavorite
                                            ? 'solar:heart-bold'
                                            : 'solar:heart-outline'
                                        }
                                        width={22}
                                      />
                                    </IconButton>
                                  </Box>
                                  <Box
                                    sx={{
                                      p: { xs: 1, sm: 1.5 },
                                      flex: 1,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      minHeight: { xs: 88, sm: 108, md: 96 },
                                    }}
                                  >
                                    <Tooltip
                                      title={course.title}
                                      arrow
                                      placement="top"
                                      disableHoverListener={!shouldShowTitleTooltip(course.title)}
                                    >
                                      <Typography
                                        variant="body1"
                                        component={RouterLink}
                                        to={getCourseDetailsPath(course.id)}
                                        sx={{
                                          fontWeight: 500,
                                          fontSize: {
                                            xs: 'clamp(0.72rem, 2.2vw, 0.9rem)',
                                            sm: '0.95rem',
                                            md: '0.98rem',
                                          },
                                          display: '-webkit-box',
                                          WebkitLineClamp: 1,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                          lineHeight: { xs: 1.32, sm: 1.36, md: 1.4 },
                                          mb: { xs: 0.45, sm: 0.75 },
                                          minHeight: { xs: '1.2em', sm: '1.25em', md: '1.35em' },
                                          wordBreak: 'break-word',
                                          color: 'inherit',
                                          textDecoration: 'none',
                                        }}
                                      >
                                        {course.title}
                                      </Typography>
                                    </Tooltip>
                                    {getCategoryTitle(course) ? (
                                      <Chip
                                        size="small"
                                        label={getCategoryTitle(course)}
                                        variant="soft"
                                        color="default"
                                        sx={{ alignSelf: 'flex-start', mb: 0.65, height: 22, fontWeight: 600 }}
                                      />
                                    ) : null}
                                    <Box
                                      sx={{
                                        mb: { xs: 0.45, sm: 0.85 },
                                        minHeight: { xs: 34, sm: 24 },
                                      }}
                                    >
                                      {moduleCount > 0 || sectionCount > 0 ? (
                                        <Stack
                                          direction={{ xs: 'column', sm: 'row' }}
                                          spacing={0.6}
                                          alignItems="flex-start"
                                        >
                                          {moduleCount > 0 && (
                                            <Stack
                                              direction="row"
                                              spacing={0.45}
                                              alignItems="center"
                                              sx={{
                                                px: 0.8,
                                                py: 0.2,
                                                borderRadius: 1,
                                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                                width: 'fit-content',
                                                maxWidth: '100%',
                                              }}
                                            >
                                              <Iconify
                                                icon="solar:widget-5-bold"
                                                width={13}
                                                sx={{ color: 'info.main' }}
                                              />
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  color: 'info.main',
                                                  fontWeight: 700,
                                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                                }}
                                              >
                                                {moduleCount} Modules
                                              </Typography>
                                            </Stack>
                                          )}
                                          {sectionCount > 0 && (
                                            <Stack
                                              direction="row"
                                              spacing={0.45}
                                              alignItems="center"
                                              sx={{
                                                px: 0.8,
                                                py: 0.2,
                                                borderRadius: 1,
                                                bgcolor: alpha(theme.palette.warning.main, 0.12),
                                                width: 'fit-content',
                                                maxWidth: '100%',
                                              }}
                                            >
                                              <Iconify
                                                icon="solar:document-text-bold"
                                                width={13}
                                                sx={{ color: 'warning.main' }}
                                              />
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  color: 'warning.main',
                                                  fontWeight: 700,
                                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                                }}
                                              >
                                                {sectionCount} Sections
                                              </Typography>
                                            </Stack>
                                          )}
                                        </Stack>
                                      ) : (
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: 'text.disabled',
                                            fontStyle: 'italic',
                                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                          }}
                                        >
                                          Modules & Sections not available
                                        </Typography>
                                      )}
                                    </Box>
                                    {course.isBundle && (
                                      <LearningBundlePill
                                        count={
                                          Array.isArray(course.bundleCourseIds)
                                            ? course.bundleCourseIds.length
                                            : 0
                                        }
                                        sx={{ mb: 0.75 }}
                                      />
                                    )}
                                    {showCourseProgress && (
                                      <Box sx={{ mb: 0.8 }}>
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          justifyContent="space-between"
                                          sx={{ mb: 0.35 }}
                                        >
                                          <Chip
                                            size="small"
                                            label={progressStatus.label}
                                            color={progressStatus.color}
                                            variant="soft"
                                            sx={{ height: 20, fontWeight: 700 }}
                                          />
                                          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                            {courseProgress}%
                                          </Typography>
                                        </Stack>
                                        <LinearProgress
                                          variant="determinate"
                                          value={Math.max(0, Math.min(100, courseProgress))}
                                          color={progressStatus.color === 'success' ? 'success' : 'warning'}
                                          sx={{ height: 6, borderRadius: 999 }}
                                        />
                                      </Box>
                                    )}
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      justifyContent="space-between"
                                      spacing={1}
                                    >
                                      <Stack
                                        direction="row"
                                        spacing={0.75}
                                        alignItems="center"
                                        flexWrap="wrap"
                                      >
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
                                              course.freeOrPaid && isEnrolled(course.id)
                                                ? 'line-through'
                                                : 'none',
                                          }}
                                        >
                                          {course.freeOrPaid
                                            ? `${Number(course.amount || 0).toFixed(2)} SGD`
                                            : 'AI Fluency'}
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
                                              {course.accessViaBundle
                                                ? 'Included in bundle'
                                                : 'Purchased'}
                                            </Typography>
                                          </Stack>
                                        )}
                                      </Stack>
                                      {(course.freeOrPaid ||
                                        isEnrolled(course.id) ||
                                        isInCart(course.id)) && (
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
                                            color:
                                              isEnrolled(course.id) || isInCart(course.id)
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
                                          aria-label={
                                            isEnrolled(course.id) ? 'Purchased' : 'Add to cart'
                                          }
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
                                                    color: isEnrolled(course.id)
                                                      ? 'success.main'
                                                      : 'primary.contrastText',
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
                            );
                          })}
                        </Grid>
                        {paginatingGroupKey === group.groupKey && (
                          <CoursesLoaderOverlay size={32} zIndex={2} />
                        )}
                      </Box>
                      {(group.pagination?.totalPages || 0) > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                          <Pagination
                            count={Math.max(1, group.pagination.totalPages || 1)}
                            page={groupPages[group.groupKey] || 1}
                            onChange={(_, value) => handleGroupPageChange(group.groupKey, value)}
                            disabled={paginatingGroupKey === group.groupKey}
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
                      <Box key={group.groupKey || group.level}>
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.75 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              color:
                                paginatingGroupKey === group.groupKey
                                  ? 'secondary.main'
                                  : 'text.primary',
                              letterSpacing: 0.2,
                              fontSize: { xs: '1.08rem', md: '1.2rem' },
                            }}
                          >
                            {group.level} ({group.pagination?.totalItems || 0})
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
                            {group.items.map((course) => {
                              const { moduleCount, sectionCount } = getCourseContentMeta(course);
                              const progressRow = courseProgressById[course.id] || {};
                              const courseProgress = Number.isFinite(progressRow.completionPercent)
                                ? progressRow.completionPercent
                                : 0;
                              const showCourseProgress = authenticated && (!course.freeOrPaid || isEnrolled(course.id));
                              const progressStatus = getCourseProgressStatus(progressRow.status, courseProgress);
                              return (
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
                                      src={course.image || defaultCourseImage}
                                      sx={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'block',
                                        objectFit: 'cover',
                                      }}
                                      onError={(e) => {
                                        e.target.src = defaultCourseImage;
                                      }}
                                    />
                                    {course.isBundle && (
                                      <LearningBundleRibbon
                                        count={
                                          Array.isArray(course.bundleCourseIds)
                                            ? course.bundleCourseIds.length
                                            : 0
                                        }
                                      />
                                    )}
                                    {group.groupKey !== 'recommended' && course.isRecommended && (
                                      <Chip
                                        size="small"
                                        label="Recommended"
                                        color="warning"
                                        sx={{
                                          position: 'absolute',
                                          top: 8,
                                          left: 8,
                                          height: 22,
                                          fontWeight: 700,
                                          zIndex: 2,
                                        }}
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
                                        color:
                                          favorites.has(course.id) || course.isFavorite
                                            ? 'error.main'
                                            : 'grey.600',
                                        boxShadow: theme.shadows[6],
                                        border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
                                        opacity: favoriteLoading.has(course.id) ? 0.6 : 1,
                                      }}
                                    >
                                      <Iconify
                                        icon={
                                          favorites.has(course.id) || course.isFavorite
                                            ? 'solar:heart-bold'
                                            : 'solar:heart-outline'
                                        }
                                        width={22}
                                      />
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
                                    <Tooltip
                                      title={course.title}
                                      arrow
                                      placement="top"
                                      disableHoverListener={!shouldShowTitleTooltip(course.title)}
                                    >
                                      <Typography
                                        variant="body1"
                                        component={RouterLink}
                                        to={getCourseDetailsPath(course.id)}
                                        sx={{
                                          fontWeight: 500,
                                          fontSize: {
                                            xs: 'clamp(0.76rem, 1.9vw, 0.92rem)',
                                            sm: '0.98rem',
                                            md: '1.05rem',
                                          },
                                          lineHeight: { xs: 1.32, sm: 1.36, md: 1.4 },
                                          mb: 0.75,
                                          display: '-webkit-box',
                                          WebkitLineClamp: 1,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                          minHeight: { xs: '1.2em', sm: '1.25em', md: '1.35em' },
                                          wordBreak: 'break-word',
                                          color: 'inherit',
                                          textDecoration: 'none',
                                        }}
                                      >
                                        {course.title}
                                      </Typography>
                                    </Tooltip>
                                    {getCategoryTitle(course) ? (
                                      <Chip
                                        size="small"
                                        label={getCategoryTitle(course)}
                                        variant="soft"
                                        color="default"
                                        sx={{ alignSelf: 'flex-start', mb: 0.65, height: 22, fontWeight: 600 }}
                                      />
                                    ) : null}
                                    <Box sx={{ mb: 0.85, minHeight: 24 }}>
                                      {moduleCount > 0 || sectionCount > 0 ? (
                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                          {moduleCount > 0 && (
                                            <Stack
                                              direction="row"
                                              spacing={0.45}
                                              alignItems="center"
                                              sx={{
                                                px: 0.8,
                                                py: 0.2,
                                                borderRadius: 1,
                                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                              }}
                                            >
                                              <Iconify
                                                icon="solar:widget-5-bold"
                                                width={13}
                                                sx={{ color: 'info.main' }}
                                              />
                                              <Typography
                                                variant="caption"
                                                sx={{ color: 'info.main', fontWeight: 700 }}
                                              >
                                                {moduleCount} Modules
                                              </Typography>
                                            </Stack>
                                          )}
                                          {sectionCount > 0 && (
                                            <Stack
                                              direction="row"
                                              spacing={0.45}
                                              alignItems="center"
                                              sx={{
                                                px: 0.8,
                                                py: 0.2,
                                                borderRadius: 1,
                                                bgcolor: alpha(theme.palette.warning.main, 0.12),
                                              }}
                                            >
                                              <Iconify
                                                icon="solar:document-text-bold"
                                                width={13}
                                                sx={{ color: 'warning.main' }}
                                              />
                                              <Typography
                                                variant="caption"
                                                sx={{ color: 'warning.main', fontWeight: 700 }}
                                              >
                                                {sectionCount} Sections
                                              </Typography>
                                            </Stack>
                                          )}
                                        </Stack>
                                      ) : (
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: 'text.disabled',
                                            fontStyle: 'italic',
                                            fontSize: { xs: '0.76rem', md: '0.8rem' },
                                          }}
                                        >
                                          Modules & Sections not available
                                        </Typography>
                                      )}
                                    </Box>
                                    {course.isBundle && (
                                      <LearningBundlePill
                                        count={
                                          Array.isArray(course.bundleCourseIds)
                                            ? course.bundleCourseIds.length
                                            : 0
                                        }
                                        sx={{ mb: 1 }}
                                      />
                                    )}
                                    {showCourseProgress && (
                                      <Box sx={{ mb: 0.95 }}>
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          justifyContent="space-between"
                                          sx={{ mb: 0.35 }}
                                        >
                                          <Chip
                                            size="small"
                                            label={progressStatus.label}
                                            color={progressStatus.color}
                                            variant="soft"
                                            sx={{ height: 20, fontWeight: 700 }}
                                          />
                                          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                            {courseProgress}%
                                          </Typography>
                                        </Stack>
                                        <LinearProgress
                                          variant="determinate"
                                          value={Math.max(0, Math.min(100, courseProgress))}
                                          color={progressStatus.color === 'success' ? 'success' : 'warning'}
                                          sx={{ height: 6, borderRadius: 999 }}
                                        />
                                      </Box>
                                    )}
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      justifyContent="space-between"
                                      spacing={1}
                                    >
                                      <Stack
                                        direction="row"
                                        spacing={0.75}
                                        alignItems="center"
                                        flexWrap="wrap"
                                      >
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
                                              course.freeOrPaid && isEnrolled(course.id)
                                                ? 'line-through'
                                                : 'none',
                                          }}
                                        >
                                          {course.freeOrPaid
                                            ? `${Number(course.amount || 0).toFixed(2)} SGD`
                                            : 'AI Fluency'}
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
                                              {course.accessViaBundle
                                                ? 'Included in bundle'
                                                : 'Purchased'}
                                            </Typography>
                                          </Stack>
                                        )}
                                      </Stack>
                                      {(course.freeOrPaid ||
                                        isEnrolled(course.id) ||
                                        isInCart(course.id)) && (
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
                                            color:
                                              isEnrolled(course.id) || isInCart(course.id)
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
                                          aria-label={
                                            isEnrolled(course.id) ? 'Purchased' : 'Add to cart'
                                          }
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
                                                    color: isEnrolled(course.id)
                                                      ? 'success.main'
                                                      : 'primary.contrastText',
                                                  }
                                                : undefined
                                            }
                                          />
                                        </IconButton>
                                      )}
                                    </Stack>
                                  </Box>
                                </Card>
                              );
                            })}
                          </Stack>
                          {paginatingGroupKey === group.groupKey && (
                            <CoursesLoaderOverlay size={32} zIndex={2} />
                          )}
                        </Box>
                        {(group.pagination?.totalPages || 0) > 1 && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                            <Pagination
                              count={Math.max(1, group.pagination.totalPages || 1)}
                              page={groupPages[group.groupKey] || 1}
                              onChange={(_, value) => handleGroupPageChange(group.groupKey, value)}
                              disabled={paginatingGroupKey === group.groupKey}
                              color="primary"
                              shape="rounded"
                              showFirstButton
                              showLastButton
                              sx={{
                                [`& .${paginationClasses.ul}`]: { justifyContent: 'flex-end' },
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </>
              {loading && !paginatingGroupKey && <CoursesLoaderOverlay top size={34} zIndex={3} />}
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Floating desktop filter control — restore with isDesktop + desktopFiltersOpen
      {isDesktop && desktopFiltersOpen && (!isDesktopFilterPanelVisible || showDesktopFloatingFilterButton) && (
        <Button ...>Remove Filters ...</Button>
      )}
      */}

      {/* Mobile filter drawer — restore with mobileFiltersOpen + renderFiltersContent
      <Drawer anchor="right" open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} ...>
        {renderFiltersContent(true)}
      </Drawer>
      */}

      <MembershipSignupDialog
        open={membershipSignupOpen}
        onClose={() => {
          clearMembershipEligibilityDraftOnModalClose();
          setMembershipSignupOpen(false);
        }}
        onContinue={(payload) => {
          setMembershipSignupOpen(false);
          const outcome = payload?.result?.outcome || '';
          const actionTarget = payload?.result?.actionTarget || '';
          const signupAccessToken = payload?.signupAccessToken || '';
          const isScaqCandidateFlow = payload?.flow?.eligibilityType === 'scaq-candidate';

          if (actionTarget === 'scaq-salesforce-auto' && payload?.flow) {
            const returnPath = `${location.pathname}${location.search || ''}`;
            navigate(
              buildScaqAssociateOptInOAuthStartUrl(payload.flow, returnPath, paths.auth.oauth.start)
            );
            return;
          }

          if ((actionTarget === 'signUp' || isScaqCandidateFlow) && payload?.flow) {
            sessionStorage.setItem(
              'membershipEligibilityFlow',
              JSON.stringify({
                membershipOutcome: outcome,
                flow: payload.flow,
                savedAt: new Date().toISOString(),
              })
            );
          }

          if (actionTarget === 'salesforce') {
            try {
              sessionStorage.setItem(
                POST_OAUTH_RETURN_TO_KEY,
                `${location.pathname}${location.search || ''}`
              );
            } catch {
              // ignore
            }
          }

          if (isScaqCandidateFlow && authenticated) {
            navigate(`${location.pathname}${location.search || ''}`);
            return;
          }

          const returnTo = encodeURIComponent(`${location.pathname}${location.search || ''}`);
          const membershipOutcome = encodeURIComponent(outcome);
          const targetPath = actionTarget === 'signUp'
            ? paths.auth.simple.signUp
            : actionTarget === 'salesforce'
              ? paths.auth.oauth.start
              : paths.auth.simple.signIn;
          const extra = `${actionTarget === 'scaq' ? '&membershipAction=scaq' : ''}${signupAccessToken ? `&signupAccessToken=${encodeURIComponent(signupAccessToken)}` : ''}`;
          navigate(`${targetPath}?returnTo=${returnTo}&membershipOutcome=${membershipOutcome}${extra}`);
        }}
      />
    </>
  );
}
