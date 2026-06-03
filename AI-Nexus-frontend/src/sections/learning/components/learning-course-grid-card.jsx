import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { RouterLink } from 'src/routes/components';
import { RichTextContent } from 'src/components/html-content';
import { htmlToPlainText, isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import { fServerDate } from 'src/utils/format-time';

import { LearningBundlePill, LearningBundleRibbon } from './course-bundle-badge';

const CARD_TITLE_LINE_HEIGHT = 1.35;
const CARD_DESC_LINE_HEIGHT = 1.45;
const CARD_META_ROW_HEIGHT = 20;
const CARD_PRICE_ROW_HEIGHT = 34;
const CARD_PROGRESS_BLOCK_HEIGHT = 36;

// ----------------------------------------------------------------------

const LEARNING_CARD_HOVER_RICH_TEXT_SX = {
  color: 'text.secondary',
  fontSize: '0.8125rem',
  lineHeight: 1.55,
  '& p': { my: 0.45, fontSize: 'inherit' },
  '& ul, & ol': { my: 0.5, pl: 2.25 },
  '& li': { mb: 0.35 },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    mt: 0.75,
    mb: 0.35,
    fontSize: '0.8125rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  '& a': { color: 'primary.main' },
  '& blockquote': {
    my: 0.5,
    pl: 1.25,
    borderLeft: '3px solid',
    borderColor: 'divider',
  },
};

function getDescriptionPreview(description, maxLen = 160) {
  const text = htmlToPlainText(description || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'No description available for this course yet.';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}…`;
}

function formatCoursePrice(course) {
  if (!course.freeOrPaid) return 'AI Fluency';
  return `${Number(course.amount || 0).toFixed(2)} SGD`;
}

function formatCourseMonthYear(value) {
  if (!value) return null;
  const formatted = fServerDate(value, 'MMMM YYYY');
  if (!formatted || formatted === 'Invalid time value') return null;
  return formatted;
}

function getCardFooterMetaHighlight({ course, moduleCount, sectionCount, updatedMonthLabel, compact = false }) {
  if (sectionCount > 0) {
    return {
      icon: 'solar:play-circle-bold',
      label: compact
        ? `${sectionCount} lesson${sectionCount === 1 ? '' : 's'}`
        : `${sectionCount} lesson${sectionCount === 1 ? '' : 's'}`,
      tone: 'info',
    };
  }
  if (moduleCount > 0) {
    return {
      icon: 'solar:widget-5-bold',
      label: `${moduleCount} module${moduleCount === 1 ? '' : 's'}`,
      tone: 'info',
    };
  }
  if (course.level) {
    return { icon: 'solar:chart-bold', label: course.level, tone: 'secondary' };
  }
  if (updatedMonthLabel) {
    return {
      icon: 'solar:calendar-mark-bold',
      label: compact ? updatedMonthLabel : `Updated ${updatedMonthLabel}`,
      tone: 'success',
    };
  }
  if (course.isBundle) {
    return { icon: 'solar:box-bold', label: compact ? 'Bundle' : 'Bundle course', tone: 'info' };
  }
  if (course.freeOrPaid) {
    return { icon: 'solar:star-bold', label: compact ? 'Premium' : 'Premium course', tone: 'secondary' };
  }
  return { icon: 'solar:leaf-bold', label: compact ? 'AI Fluency' : 'AI Fluency course', tone: 'success' };
}

function CourseModulesSectionsRow({ moduleCount, sectionCount, size = 'compact', sx }) {
  const theme = useTheme();
  const isHover = size === 'hover';
  const iconSize = isHover ? 13 : 12;
  const fontSize = isHover
    ? { xs: '0.68rem', sm: '0.72rem' }
    : { xs: '0.62rem', sm: '0.68rem' };

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      flexWrap="wrap"
      sx={{
        ...(isHover
          ? { mb: 1 }
          : {
              height: { xs: 18, sm: CARD_META_ROW_HEIGHT },
              minHeight: { xs: 18, sm: CARD_META_ROW_HEIGHT },
              flexShrink: 0,
              overflow: 'hidden',
            }),
        ...sx,
      }}
    >
      {moduleCount > 0 || sectionCount > 0 ? (
        <>
          {moduleCount > 0 && (
            <Stack
              direction="row"
              spacing={0.35}
              alignItems="center"
              sx={{
                px: isHover ? 0.75 : 0.65,
                py: isHover ? 0.25 : 0.15,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.info.main, 0.1),
              }}
            >
              <Iconify icon="solar:widget-5-bold" width={iconSize} sx={{ color: 'info.main' }} />
              <Typography
                variant="caption"
                sx={{ color: 'info.main', fontWeight: 700, fontSize, lineHeight: 1 }}
              >
                {moduleCount} Modules
              </Typography>
            </Stack>
          )}
          {sectionCount > 0 && (
            <Stack
              direction="row"
              spacing={0.35}
              alignItems="center"
              sx={{
                px: isHover ? 0.75 : 0.65,
                py: isHover ? 0.25 : 0.15,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.warning.main, 0.12),
              }}
            >
              <Iconify icon="solar:document-text-bold" width={iconSize} sx={{ color: 'warning.main' }} />
              <Typography
                variant="caption"
                sx={{ color: 'warning.main', fontWeight: 700, fontSize, lineHeight: 1 }}
              >
                {sectionCount} Sections
              </Typography>
            </Stack>
          )}
        </>
      ) : (
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            fontStyle: 'italic',
            fontSize,
            lineHeight: 1,
          }}
        >
          Modules & Sections not available
        </Typography>
      )}
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
  detailsHref,
  onImageClick,
  onFavorite,
  onAddToCart,
  onViewDetails,
}) {
  const theme = useTheme();
  const isCompactCard = useMediaQuery(theme.breakpoints.down('sm'));
  const bundleCount = Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds.length : 0;
  const showRecommendedBadge = groupKey !== 'recommended' && course.isRecommended;
  const priceLabel = formatCoursePrice(course);
  const cardDescriptionPreview = getDescriptionPreview(course.description, 96);
  const showAddToCart = (course.freeOrPaid || isInCart) && !isEnrolled;
  const showMobileCartAction = (course.freeOrPaid || isInCart) && !isEnrolled;

  const updatedMonthLabel = formatCourseMonthYear(course.updatedAt || course.createdAt);
  const hoverDescriptionHtml = isEffectivelyEmptyHtml(course.description)
    ? '<p>No description available for this course yet.</p>'
    : course.description;
  const courseTypeLabel = course.isBundle ? 'Bundle' : course.freeOrPaid ? 'Premium' : 'AI Fluency';
  const courseTypeColor = course.isBundle ? 'info' : course.freeOrPaid ? 'secondary' : 'success';
  const purchasedLabel = course.accessViaBundle ? 'Included in bundle' : 'Purchased';
  const cardFooterHighlight = getCardFooterMetaHighlight({
    course,
    moduleCount,
    sectionCount,
    updatedMonthLabel,
    compact: isCompactCard,
  });

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        zIndex: 0,
        '@media (hover: hover)': {
          '&:hover': { zIndex: theme.zIndex.tooltip },
          '&:hover .learning-course-hover-panel': {
            opacity: 1,
            visibility: 'visible',
            pointerEvents: 'auto',
            transform: 'translateY(0)',
          },
          '&:hover .learning-course-card-root': {
            boxShadow: theme.customShadows.z20,
          },
        },
      }}
    >
      <Card
        className="learning-course-card-root"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 1.5,
          boxShadow: theme.customShadows.z4,
          overflow: 'hidden',
          color: 'inherit',
          transition: 'box-shadow 0.22s ease',
        }}
      >
        <Box
          onClick={(e) => onImageClick?.(e, course)}
          sx={{
            position: 'relative',
            height: { xs: 96, sm: 108 },
            bgcolor: 'grey.100',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          <Image
            alt={course.title}
            src={course.image || defaultCourseImage}
            sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
            onError={(e) => {
              e.target.src = defaultCourseImage;
            }}
          />
          <Box
            className="learning-course-play-hint"
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.common.black, 0.28),
              opacity: 0,
              transition: 'opacity 0.2s ease',
              '@media (hover: hover)': {
                '.learning-course-card-root:hover &': { opacity: 1 },
              },
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.common.white, 0.95),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon="solar:play-bold" width={20} sx={{ color: 'primary.main', ml: 0.2 }} />
            </Box>
          </Box>
          {course.isBundle ? <LearningBundleRibbon count={bundleCount} /> : null}
          {showRecommendedBadge ? (
            <Chip
              size="small"
              label="Recommended"
              color="warning"
              sx={{
                position: 'absolute',
                top: 6,
                left: 6,
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                zIndex: 2,
              }}
            />
          ) : null}
          <IconButton
            size="small"
            onClick={(e) => onFavorite?.(e, course.id)}
            disabled={favoriteLoading}
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 30,
              height: 30,
              bgcolor: alpha(theme.palette.common.white, 0.98),
              color: isFavorite ? 'error.main' : 'grey.600',
              boxShadow: theme.shadows[4],
              '&:hover': { bgcolor: 'common.white' },
              opacity: favoriteLoading ? 0.6 : 1,
            }}
            aria-label="Favorite"
          >
            <Iconify icon={isFavorite ? 'solar:heart-bold' : 'solar:heart-outline'} width={18} />
          </IconButton>
        </Box>

        <Box
          sx={{
            p: { xs: 1, sm: 1.15, md: 1.25 },
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 0.5, sm: 0.65 },
            minHeight: 0,
          }}
        >
          <Typography
            variant="subtitle2"
            component={RouterLink}
            to={detailsHref}
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.9rem' },
              lineHeight: CARD_TITLE_LINE_HEIGHT,
              minHeight: {
                xs: `calc(0.8125rem * ${CARD_TITLE_LINE_HEIGHT} * 2)`,
                sm: `calc(0.875rem * ${CARD_TITLE_LINE_HEIGHT} * 2)`,
                md: `calc(0.9rem * ${CARD_TITLE_LINE_HEIGHT} * 2)`,
              },
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              color: 'text.primary',
              textDecoration: 'none',
              flexShrink: 0,
              '&:hover': { color: 'primary.main' },
            }}
          >
            {course.title}
          </Typography>

          <CourseModulesSectionsRow moduleCount={moduleCount} sectionCount={sectionCount} />

          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '0.7rem', sm: '0.72rem', md: '0.75rem' },
              lineHeight: CARD_DESC_LINE_HEIGHT,
              minHeight: {
                xs: `calc(0.7rem * ${CARD_DESC_LINE_HEIGHT})`,
                sm: `calc(0.72rem * ${CARD_DESC_LINE_HEIGHT})`,
                md: `calc(0.75rem * ${CARD_DESC_LINE_HEIGHT})`,
              },
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {cardDescriptionPreview}
          </Typography>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={0.5}
            sx={{
              minHeight: { xs: 32, sm: CARD_PRICE_ROW_HEIGHT },
              height: { xs: 32, sm: CARD_PRICE_ROW_HEIGHT },
              flexShrink: 0,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}
            >
              <Typography
                variant="caption"
                noWrap
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.8125rem' },
                  color: course.freeOrPaid ? (isEnrolled ? 'text.disabled' : 'secondary.main') : 'success.main',
                  textDecoration: course.freeOrPaid && isEnrolled ? 'line-through' : 'none',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {priceLabel}
              </Typography>
              {isEnrolled ? (
                isCompactCard ? (
                  <Box
                    title={purchasedLabel}
                    aria-label={purchasedLabel}
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      bgcolor: alpha(theme.palette.success.main, 0.14),
                      color: 'success.main',
                      border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                    }}
                  >
                    <Iconify icon="solar:verified-check-bold" width={14} />
                  </Box>
                ) : (
                  <Chip
                    size="small"
                    label={purchasedLabel}
                    color="success"
                    variant="soft"
                    icon={<Iconify icon="solar:verified-check-bold" width={12} />}
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      maxWidth: '58%',
                      flexShrink: 1,
                      '& .MuiChip-icon': { color: 'inherit', ml: 0.35, width: 12, height: 12 },
                      '& .MuiChip-label': { px: 0.75, overflow: 'hidden', textOverflow: 'ellipsis' },
                    }}
                  />
                )
              ) : null}
            </Stack>
            {showMobileCartAction ? (
              <IconButton
                size="small"
                onClick={(e) => onAddToCart?.(e, course)}
                disabled={isEnrolled}
                aria-label={isEnrolled ? 'Purchased' : 'Add to cart'}
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  flexShrink: 0,
                  width: { xs: 30, sm: 34 },
                  height: { xs: 30, sm: 34 },
                  bgcolor: isEnrolled
                    ? 'common.white'
                    : isInCart
                      ? 'primary.main'
                      : 'warning.main',
                  color:
                    isEnrolled || isInCart
                      ? isEnrolled
                        ? 'success.main'
                        : 'primary.contrastText'
                      : 'warning.contrastText',
                  boxShadow: theme.shadows[4],
                  border: `1px solid ${
                    isEnrolled
                      ? alpha(theme.palette.success.main, 0.45)
                      : isInCart
                        ? alpha(theme.palette.primary.main, 0.4)
                        : alpha(theme.palette.common.white, 0.24)
                  }`,
                  '&:hover': {
                    bgcolor: isEnrolled
                      ? alpha(theme.palette.success.main, 0.08)
                      : isInCart
                        ? 'primary.dark'
                        : 'warning.dark',
                  },
                  opacity: isEnrolled ? 0.9 : 1,
                }}
              >
                <Iconify
                  icon={
                    isEnrolled
                      ? 'solar:verified-check-bold'
                      : isInCart
                        ? 'solar:cart-check-bold'
                        : 'solar:cart-plus-bold'
                  }
                  width={18}
                  sx={
                    isEnrolled || isInCart
                      ? { color: isEnrolled ? 'success.main' : 'primary.contrastText' }
                      : undefined
                  }
                />
              </IconButton>
            ) : null}
          </Stack>

          <Box
            sx={{
              minHeight: { xs: 32, sm: CARD_PROGRESS_BLOCK_HEIGHT },
              height: { xs: 32, sm: CARD_PROGRESS_BLOCK_HEIGHT },
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            {showCourseProgress ? (
              <Box sx={{ width: '100%' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                  <Chip
                    size="small"
                    label={progressStatus.label}
                    color={progressStatus.color}
                    variant="soft"
                    sx={{
                      height: { xs: 20, sm: 22 },
                      maxWidth: '72%',
                      fontSize: { xs: '0.65rem', sm: '0.72rem' },
                      fontWeight: 600,
                      '& .MuiChip-label': { px: 0.75, overflow: 'hidden', textOverflow: 'ellipsis' },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 700,
                      fontSize: { xs: '0.68rem', sm: '0.75rem' },
                      flexShrink: 0,
                    }}
                  >
                    {courseProgress}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, courseProgress))}
                  color={progressStatus.color === 'success' ? 'success' : 'warning'}
                  sx={{ height: { xs: 4, sm: 5 }, borderRadius: 999 }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: { xs: 0.65, sm: 0.85, md: 1 },
                  borderRadius: 1,
                  bgcolor: (paletteTheme) => paletteTheme.palette[cardFooterHighlight.tone].main,
                  color: (paletteTheme) => paletteTheme.palette[cardFooterHighlight.tone].contrastText,
                  boxShadow: `inset 0 -1px 0 ${alpha(theme.palette.common.black, 0.08)}`,
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.45}
                  sx={{ width: '100%', minWidth: 0, justifyContent: 'center' }}
                >
                  <Iconify
                    icon={cardFooterHighlight.icon}
                    width={isCompactCard ? 12 : 14}
                    sx={{ flexShrink: 0, opacity: 0.95 }}
                  />
                  <Typography
                    variant="caption"
                    noWrap
                    title={cardFooterHighlight.label}
                    sx={{
                      fontSize: { xs: '0.64rem', sm: '0.68rem', md: '0.72rem' },
                      fontWeight: 700,
                      lineHeight: 1.2,
                      letterSpacing: '0.01em',
                      minWidth: 0,
                    }}
                  >
                    {cardFooterHighlight.label}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Card>

      {/* Udemy-style hover detail panel */}
      <Paper
        className="learning-course-hover-panel"
        elevation={12}
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: 'absolute',
          top: { xs: 'calc(100% + 8px)', md: 0 },
          left: { xs: 0, md: 'calc(100% + 10px)' },
          right: { xs: 0, md: 'auto' },
          width: { xs: 'min(100%, 300px)', md: 340 },
          maxWidth: { xs: '100%', md: 360 },
          zIndex: theme.zIndex.tooltip,
          p: 2,
          borderRadius: 1.5,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          boxShadow: theme.customShadows.z24,
          opacity: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
          transform: { xs: 'translateY(6px)', md: 'translateX(-6px)' },
          transition: theme.transitions.create(['opacity', 'transform', 'visibility'], {
            duration: 220,
            easing: theme.transitions.easing.easeOut,
          }),
          '@media (hover: none)': {
            display: 'none',
          },
        }}
      >
        <Typography
          variant="subtitle1"
          component={RouterLink}
          to={detailsHref}
          onClick={(e) => onViewDetails?.(e, course.id)}
          sx={{
            fontWeight: 800,
            fontSize: '1rem',
            lineHeight: 1.35,
            mb: 1,
            display: 'block',
            color: 'text.primary',
            textDecoration: 'none',
            '&:hover': { color: 'primary.main' },
          }}
        >
          {course.title}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          <Chip
            size="small"
            icon={<Iconify icon="solar:verified-check-bold" width={14} />}
            label={courseTypeLabel}
            color={courseTypeColor}
            sx={{
              height: 26,
              fontWeight: 700,
              fontSize: '0.75rem',
              '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
            }}
          />
          {isEnrolled ? (
            <Chip
              size="small"
              icon={<Iconify icon="solar:verified-check-bold" width={14} />}
              label={purchasedLabel}
              color="success"
              sx={{
                height: 26,
                fontWeight: 700,
                fontSize: '0.75rem',
                '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
              }}
            />
          ) : null}
          {updatedMonthLabel ? (
            <Typography
              variant="caption"
              sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.2 }}
            >
              Updated {updatedMonthLabel}
            </Typography>
          ) : null}
        </Stack>

        <CourseModulesSectionsRow moduleCount={moduleCount} sectionCount={sectionCount} size="hover" />

        {course.isBundle ? <LearningBundlePill count={bundleCount} sx={{ mb: 1 }} /> : null}

        <Box
          sx={{
            mb: 1.5,
            maxHeight: 320,
            overflowY: 'auto',
            pr: 0.25,
            scrollbarWidth: 'thin',
          }}
        >
          <RichTextContent
            html={hoverDescriptionHtml}
            listPreview
            sx={LEARNING_CARD_HOVER_RICH_TEXT_SX}
          />
        </Box>

        {showAddToCart ? (
          <Button
            variant="contained"
            fullWidth
            color="secondary"
            onClick={(e) => onAddToCart?.(e, course)}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9375rem',
              py: 1.1,
              minHeight: 42,
              borderRadius: 1,
              boxShadow: theme.customShadows?.z8,
            }}
          >
            {isInCart ? 'Go to cart' : 'Add to cart'}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            component={RouterLink}
            to={detailsHref}
            onClick={(e) => onViewDetails?.(e, course.id)}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9375rem',
              py: 1.1,
              minHeight: 42,
              borderRadius: 1,
              boxShadow: theme.customShadows?.z8,
            }}
          >
            View course
          </Button>
        )}
      </Paper>
    </Box>
  );
}
