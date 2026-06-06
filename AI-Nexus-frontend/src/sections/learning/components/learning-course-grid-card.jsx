import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { RouterLink } from 'src/routes/components';
import { LearningBundleRibbon } from './course-bundle-badge';

const CARD_META_ROW_HEIGHT = 18;
const CARD_STATUS_ROW_HEIGHT = 30;
const CARD_PROGRESS_SLOT_HEIGHT = 30;
const CARD_TITLE_LINE_HEIGHT = 1.35;
const CARD_TITLE_LINES = 2;
const CARD_IMAGE_RATIO = '16/10';

// ----------------------------------------------------------------------

const isPaidCourse = (value) => value === true || value === 'true' || value === 1 || value === '1';

function getCourseAccessLabel(course) {
  if (course.isBundle) return 'Bundle';
  return isPaidCourse(course.freeOrPaid) ? 'Premium' : 'AI Fluency';
}

function formatCoursePrice(course) {
  if (!isPaidCourse(course.freeOrPaid)) return 'AI Fluency';
  return `${Number(course.amount || 0).toFixed(2)} SGD`;
}

function CardMetaItemMobile({ icon, label, iconColor, isPlaceholder, iconOnly = false, sx }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      spacing={0.3}
      sx={{ flex: 1, minWidth: 0, px: 0.1, ...sx }}
    >
      <Iconify
        icon={icon}
        width={iconOnly ? 15 : 13}
        sx={{ color: iconColor || 'text.secondary', flexShrink: 0 }}
      />
      {iconOnly ? null : (
        <Typography
          variant="caption"
          noWrap
          sx={{
            color: isPlaceholder ? 'text.disabled' : 'text.primary',
            fontWeight: 700,
            fontSize: '0.62rem',
            lineHeight: 1.15,
            minWidth: 0,
          }}
        >
          {label}
        </Typography>
      )}
    </Stack>
  );
}

function CardMetaItem({ icon, label, iconColor, isPlaceholder, align = 'flex-start' }) {
  return (
    <Stack
      direction="row"
      spacing={0.45}
      alignItems="center"
      justifyContent={align}
      sx={{ minWidth: 0, width: '100%' }}
    >
      <Iconify
        icon={icon}
        width={14}
        sx={{ color: iconColor || 'info.main', flexShrink: 0 }}
      />
      <Typography
        variant="caption"
        noWrap
        sx={{
          color: isPlaceholder ? 'text.disabled' : 'text.primary',
          fontWeight: 700,
          fontSize: '0.75rem',
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

function LearningCourseEnrolledStatusRow({ course, isPaid, purchasedLabel }) {
  return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{ width: '100%', minWidth: 0, flexWrap: 'nowrap' }}
      >
        {isPaid ? (
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: 'text.disabled',
              fontWeight: 700,
              fontSize: '0.8125rem',
              textDecoration: 'line-through',
              flexShrink: 0,
            }}
          >
            {formatCoursePrice(course)}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0, minWidth: 0 }}>
          <Iconify icon="solar:verified-check-bold" width={14} sx={{ color: 'success.main', flexShrink: 0 }} />
          <Typography
            variant="caption"
            noWrap
            sx={{ color: 'success.main', fontWeight: 700, fontSize: '0.8125rem' }}
          >
            {purchasedLabel}
          </Typography>
        </Stack>
      </Stack>
  );
}

// ----------------------------------------------------------------------

export function LearningCourseGridCard({
  course,
  defaultCourseImage,
  groupKey,
  moduleCount = 0,
  sectionCount = 0,
  showCourseProgress = false,
  courseProgress = 0,
  progressStatus = { label: 'Not Started', color: 'default' },
  isFavorite = false,
  favoriteLoading = false,
  isEnrolled = false,
  isInCart = false,
  assignmentSummary = null,
  showFavorite = true,
  detailsHref,
  onImageClick,
  onFavorite,
  onAddToCart,
  onViewDetails,
}) {
  const theme = useTheme();
  const bundleCount = Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds.length : 0;
  const showPopularBadge =
    groupKey === 'recommended' || (groupKey !== 'recommended' && course.isRecommended);
  const isPaid = isPaidCourse(course.freeOrPaid);
  const courseAccessLabel = getCourseAccessLabel(course);
  const showAccessLabel = !isEnrolled && !course.isBundle;
  const showAddToCart = (isPaid || isInCart) && !isEnrolled;
  const showProgressSlot = showCourseProgress || showAddToCart;
  const showStatusAccessLabel = showAccessLabel;
  const showAccessInProgressSlot = showStatusAccessLabel && !showProgressSlot && !isEnrolled;
  const showStatusRow = isEnrolled || (showStatusAccessLabel && showProgressSlot);

  const levelLabel = course.level || 'All levels';
  const durationLabel =
    sectionCount > 0
      ? `${sectionCount} lesson${sectionCount === 1 ? '' : 's'}`
      : moduleCount > 0
        ? `${moduleCount} module${moduleCount === 1 ? '' : 's'}`
        : '—';
  const reviewCount = Number(course?.reviewStats?.reviewCount || 0);
  const averageRating = Number(course?.reviewStats?.averageRating || 0);
  const ratingLabel = reviewCount > 0 ? averageRating.toFixed(1) : '—';
  const primaryActionLabel = isEnrolled
    ? courseProgress >= 100
      ? 'Review Course'
      : courseProgress > 0
        ? 'Continue Learning'
        : 'View Course'
    : 'View Course';
  const purchasedLabel = course.accessViaBundle ? 'In bundle' : 'Purchased';
  const pendingAssignments = Number(assignmentSummary?.pendingCount || 0);
  const totalAssignments = Number(assignmentSummary?.totalAssignments || 0);
  const showAssignmentChip = isEnrolled && totalAssignments > 0;

  return (
      <Card
        className="learning-course-card-root"
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 0,
          borderRadius: 2,
          border: showFavorite
            ? `1.5px solid ${alpha(theme.palette.primary.main, 0.28)}`
            : `1px solid ${alpha(theme.palette.grey[500], 0.18)}`,
          boxShadow: 'none',
          bgcolor: 'background.paper',
          overflow: 'hidden',
          color: 'inherit',
          p: { xs: 1.15, sm: 1.25 },
          transition: 'box-shadow 0.28s ease, transform 0.28s ease, border-color 0.28s ease',
          ...(showFavorite
            ? {
                animation: 'learningCourseCardBorderPulse 3s ease-in-out infinite',
                '@keyframes learningCourseCardBorderPulse': {
                  '0%, 100%': {
                    borderColor: alpha(theme.palette.primary.main, 0.22),
                    boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0)}`,
                  },
                  '50%': {
                    borderColor: alpha(theme.palette.primary.main, 0.48),
                    boxShadow: `0 0 16px -3px ${alpha(theme.palette.primary.main, 0.22)}`,
                  },
                },
              }
            : {}),
          '@media (hover: hover)': {
            '&:hover': {
              zIndex: 1,
              animation: 'none',
              transform: 'translateY(-4px)',
              borderColor: theme.palette.primary.main,
              boxShadow: `0 10px 28px -8px ${alpha(theme.palette.primary.main, 0.34)}`,
            },
          },
        }}
      >
        <Box
          onClick={(e) => onImageClick?.(e, course)}
          sx={{
            position: 'relative',
            mb: 1,
            borderRadius: 1.5,
            overflow: 'hidden',
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            width: '100%',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          <Image
            alt={course.title}
            src={course.image || defaultCourseImage}
            ratio={CARD_IMAGE_RATIO}
            sx={{ width: '100%', display: 'block' }}
            onError={(e) => {
              e.target.src = defaultCourseImage;
            }}
          />
          {course.isBundle ? <LearningBundleRibbon count={bundleCount} /> : null}
          {showPopularBadge ? (
            <Chip
              size="small"
              label="Popular"
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                height: 22,
                fontSize: '0.65rem',
                fontWeight: 600,
                zIndex: 2,
                bgcolor: alpha(theme.palette.success.main, 0.92),
                color: 'common.white',
                '& .MuiChip-label': { px: 0.85 },
              }}
            />
          ) : null}
          {showFavorite ? (
            <IconButton
              size="small"
              onClick={(e) => onFavorite?.(e, course.id)}
              disabled={favoriteLoading}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 32,
                height: 32,
                bgcolor: alpha(theme.palette.common.white, 0.96),
                color: isFavorite ? 'error.main' : 'grey.600',
                boxShadow: theme.shadows[2],
                '&:hover': { bgcolor: 'common.white' },
                opacity: favoriteLoading ? 0.6 : 1,
              }}
              aria-label="Favorite"
            >
              <Iconify icon={isFavorite ? 'solar:heart-bold' : 'solar:heart-outline'} width={18} />
            </IconButton>
          ) : null}
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 0.85, sm: 0.65 },
            minHeight: 0,
          }}
        >
          <Typography
            variant="subtitle1"
            component={RouterLink}
            to={detailsHref}
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.85rem', sm: '0.9rem' },
              lineHeight: CARD_TITLE_LINE_HEIGHT,
              letterSpacing: -0.01,
              minHeight: `${CARD_TITLE_LINES * CARD_TITLE_LINE_HEIGHT}em`,
              flexShrink: 0,
              display: '-webkit-box',
              WebkitLineClamp: CARD_TITLE_LINES,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              color: 'text.primary',
              textDecoration: 'none',
              '&:hover': { color: 'primary.main' },
            }}
          >
            {course.title}
          </Typography>

          <Box
            sx={{
              display: { xs: 'flex', sm: 'none' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 0.5,
              minHeight: 22,
              flexShrink: 0,
              width: '100%',
            }}
          >
            <CardMetaItemMobile
              icon="solar:chart-2-bold"
              label={levelLabel}
              iconColor="secondary.main"
              sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start' }}
            />
            <CardMetaItemMobile
              icon="solar:star-bold"
              label={ratingLabel}
              iconColor="warning.main"
              isPlaceholder={ratingLabel === '—'}
              sx={{ flex: 'unset', justifyContent: 'flex-end' }}
            />
          </Box>

          <Box
            sx={{
              display: { xs: 'none', sm: 'grid' },
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              columnGap: 1.25,
              alignItems: 'center',
              minHeight: CARD_META_ROW_HEIGHT,
              flexShrink: 0,
              width: '100%',
            }}
          >
            <CardMetaItem
              icon="solar:chart-2-bold"
              label={levelLabel}
              iconColor="secondary.main"
              align="flex-start"
            />
            <CardMetaItem
              icon="solar:clock-circle-bold"
              label={durationLabel}
              iconColor="info.main"
              isPlaceholder={durationLabel === '—'}
              align="center"
            />
            <CardMetaItem
              icon="solar:star-bold"
              label={ratingLabel}
              iconColor="warning.main"
              isPlaceholder={ratingLabel === '—'}
              align="flex-end"
            />
          </Box>

          <Box
            sx={{
              width: '100%',
              minHeight: showProgressSlot || showAccessInProgressSlot ? CARD_PROGRESS_SLOT_HEIGHT : 0,
              flexShrink: 0,
              display: showProgressSlot || showAccessInProgressSlot ? 'flex' : 'none',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {showCourseProgress ? (
              <>
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
                    sx={{
                      height: { xs: 18, sm: 20 },
                      fontSize: { xs: '0.62rem', sm: '0.68rem' },
                      fontWeight: 600,
                      maxWidth: { xs: '72%', sm: 'none' },
                      '& .MuiChip-label': { px: { xs: 0.65, sm: 0.85 } },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: 'primary.main', fontWeight: 700, fontSize: { xs: '0.68rem', sm: '0.75rem' } }}
                  >
                    {courseProgress}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, courseProgress))}
                  color={progressStatus.color === 'success' ? 'success' : 'warning'}
                  sx={{ height: 4, borderRadius: 999 }}
                />
                {showAssignmentChip ? (
                  <Chip
                    size="small"
                    icon={<Iconify icon="solar:document-add-bold" width={14} />}
                    label={
                      pendingAssignments > 0
                        ? `${pendingAssignments} assignment${pendingAssignments !== 1 ? 's' : ''} pending`
                        : `${totalAssignments} assignment${totalAssignments !== 1 ? 's' : ''} submitted`
                    }
                    color={pendingAssignments > 0 ? 'warning' : 'success'}
                    variant="soft"
                    sx={{
                      mt: 0.75,
                      height: 22,
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      alignSelf: 'flex-start',
                    }}
                  />
                ) : null}
              </>
            ) : showAddToCart ? (
              <Stack
                direction="row"
                alignItems="center"
                spacing={{ xs: 0.65, sm: 0.85 }}
                onClick={(e) => onAddToCart?.(e, course)}
                role="button"
                tabIndex={0}
                aria-label={
                  isInCart
                    ? `In your cart, ${formatCoursePrice(course)}`
                    : `Add to cart, ${formatCoursePrice(course)}`
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onAddToCart?.(e, course);
                  }
                }}
                sx={{
                  width: '100%',
                  px: 0.85,
                  py: 0.45,
                  minHeight: CARD_STATUS_ROW_HEIGHT,
                  borderRadius: 1,
                  cursor: 'pointer',
                  justifyContent: { xs: 'space-between', sm: 'flex-start' },
                  bgcolor: alpha(theme.palette.grey[500], 0.05),
                  border: `1px solid ${alpha(theme.palette.grey[500], 0.1)}`,
                  transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
                    duration: 180,
                  }),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    borderColor: alpha(theme.palette.primary.main, 0.16),
                    boxShadow: `0 1px 0 ${alpha(theme.palette.primary.main, 0.06)}`,
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: { xs: 28, sm: 24 },
                      height: { xs: 28, sm: 24 },
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      bgcolor: alpha(isInCart ? theme.palette.primary.main : theme.palette.warning.main, 0.12),
                      color: isInCart ? 'primary.main' : 'warning.dark',
                    }}
                  >
                    <Iconify
                      icon={isInCart ? 'solar:cart-check-bold' : 'solar:cart-plus-bold'}
                      width={15}
                    />
                  </Box>
                </Stack>
                <Box
                  sx={{
                    flex: { xs: 'unset', sm: 1 },
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: { xs: 'flex-end', sm: 'space-between' },
                    gap: 0.75,
                  }}
                >
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      display: { xs: 'none', sm: 'block' },
                      flex: 1,
                      minWidth: 0,
                      fontSize: '0.8125rem',
                      lineHeight: 1.3,
                      color: isInCart ? 'primary.main' : 'text.primary',
                      fontWeight: 700,
                    }}
                  >
                    {isInCart ? 'In your cart' : 'Add to cart'}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      flexShrink: 0,
                      fontSize: { xs: '0.78rem', sm: '0.8125rem' },
                      lineHeight: 1.3,
                      fontWeight: 800,
                      color: isInCart ? 'primary.main' : 'success.main',
                    }}
                  >
                    {isInCart ? (
                      <>
                        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                          {formatCoursePrice(course)}
                        </Box>
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                          Checkout
                        </Box>
                      </>
                    ) : (
                      formatCoursePrice(course)
                    )}
                  </Typography>
                </Box>
              </Stack>
            ) : showAccessInProgressSlot ? (
              <Chip
                size="small"
                label={courseAccessLabel}
                sx={{
                  alignSelf: 'flex-start',
                  height: 22,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: 0.15,
                  bgcolor: alpha(theme.palette.success.main, 0.12),
                  color: 'success.dark',
                  border: `1px solid ${alpha(theme.palette.success.main, 0.28)}`,
                  '& .MuiChip-label': { px: 0.85 },
                }}
              />
            ) : null}
          </Box>

          <Box
            sx={{
              minHeight: showStatusRow ? CARD_STATUS_ROW_HEIGHT : 0,
              flexShrink: 0,
              width: '100%',
              display: showStatusRow ? 'flex' : 'none',
              alignItems: 'center',
            }}
          >
            {isEnrolled ? (
              <LearningCourseEnrolledStatusRow
                course={course}
                isPaid={isPaid}
                purchasedLabel={purchasedLabel}
              />
            ) : showStatusAccessLabel ? (
              <Typography
                variant="caption"
                sx={{
                  color: 'success.main',
                  fontWeight: 800,
                  fontSize: '0.8125rem',
                  lineHeight: 1.2,
                  letterSpacing: 0.15,
                }}
              >
                {courseAccessLabel}
              </Typography>
            ) : null}
          </Box>

          <Button
            component={RouterLink}
            to={detailsHref}
            variant="contained"
            color="primary"
            fullWidth
            onClick={(e) => onViewDetails?.(e, course.id)}
            sx={{
              mt: 'auto',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.78rem', md: '0.8125rem' },
              letterSpacing: 0.05,
              py: { xs: 0.55, md: 0.65 },
              minHeight: { xs: 32, md: 34 },
              borderRadius: 1,
              boxShadow: 'none',
            }}
          >
            {primaryActionLabel}
          </Button>
        </Box>
      </Card>
  );
}
