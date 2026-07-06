import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ButtonBase from '@mui/material/ButtonBase';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { formatViewCount } from 'src/utils/format-view-count';
import { RichTextContent } from 'src/components/html-content';
import { useAuthContext } from 'src/auth/hooks';
import { announcementService } from 'src/services/announcement.service';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

const CLAMP_LINES = 2;
const LINE_HEIGHT = 1.55;

export function AnnouncementItem({
  announcement,
  isUnread = false,
  onPinToggle,
  onViewCountUpdate,
  onMarkRead,
  showBottomDivider = true,
}) {
  const theme = useTheme();
  const { authenticated } = useAuthContext();
  const contentRef = useRef(null);
  const [isPinned, setIsPinned] = useState(announcement.isPinned || false);
  const [isPinning, setIsPinning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(null);

  useEffect(() => {
    setIsPinned(announcement.isPinned || false);
  }, [announcement.isPinned]);

  const previewHtml = announcement.content || announcement.description || '';

  useEffect(() => {
    setExpanded(false);
    setIsOverflowing(null);
    setViewCounted(false);
  }, [announcement.id, previewHtml]);

  const measureOverflow = useCallback(() => {
    const el = contentRef.current;
    if (!el || expanded) return;
    setIsOverflowing(el.scrollHeight > el.clientHeight + 2);
  }, [expanded]);

  useLayoutEffect(() => {
    if (!previewHtml) {
      setIsOverflowing(false);
      return undefined;
    }
    if (expanded) return undefined;

    measureOverflow();
    const el = contentRef.current;
    if (!el) return undefined;

    const images = el.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', measureOverflow);
        img.addEventListener('error', measureOverflow);
      }
    });

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => measureOverflow());
      resizeObserver.observe(el);
    }

    return () => {
      images.forEach((img) => {
        img.removeEventListener('load', measureOverflow);
        img.removeEventListener('error', measureOverflow);
      });
      resizeObserver?.disconnect();
    };
  }, [previewHtml, expanded, measureOverflow]);

  const creatorName = useMemo(() => {
    const creator = announcement?.createdBy;
    if (!creator) return '';
    return (
      [creator.firstname, creator.lastname].filter(Boolean).join(' ').trim() ||
      creator.username ||
      creator.email ||
      ''
    );
  }, [announcement?.createdBy]);

  const handlePinToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPinning) return;

    try {
      setIsPinning(true);
      const result = await announcementService.togglePinAnnouncement(announcement.id);
      setIsPinned(result.pinned);
      onPinToggle?.(announcement.id, result.pinned);
      toast.success(result.message);
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error(error?.response?.data?.message || 'Failed to toggle pin');
    } finally {
      setIsPinning(false);
    }
  };

  const handleToggleExpand = useCallback(async () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);

    if (nextExpanded) {
      if (isUnread) {
        onMarkRead?.(announcement.id);
      }
      if (!viewCounted) {
        setViewCounted(true);
        try {
          const updated = await announcementService.incrementViewCount(announcement.id);
          onViewCountUpdate?.(announcement.id, updated.viewCount ?? (announcement.views || 0) + 1);
        } catch (error) {
          console.error('Error incrementing announcement view count:', error);
        }
      }
    }
  }, [
    announcement.id,
    announcement.views,
    expanded,
    isUnread,
    onMarkRead,
    onViewCountUpdate,
    viewCounted,
  ]);

  const handleMarkReadClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkRead?.(announcement.id);
  };

  const shouldClamp = !expanded && isOverflowing !== false;
  const showViewMore = isOverflowing === true || expanded;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'block',
        width: '100%',
        minWidth: 0,
        py: 1.5,
        pl: { xs: 1.5, md: 2 },
        pr: { xs: 1.25, md: 2 },
        borderBottom: showBottomDivider
          ? `1px solid ${alpha(theme.palette.grey[500], 0.1)}`
          : 'none',
        bgcolor: isUnread ? alpha(theme.palette.info.main, 0.06) : 'transparent',
        transition: theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          bgcolor: isUnread
            ? alpha(theme.palette.info.main, 0.09)
            : alpha(theme.palette.grey[500], 0.04),
        },
        ...(isUnread && {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            bgcolor: 'info.main',
            borderRadius: '0 2px 2px 0',
          },
        }),
      }}
    >
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0, width: 1 }}>
          {isUnread ? (
            <Box
              component="span"
              sx={{
                width: 8,
                height: 8,
                mt: 0.85,
                borderRadius: '50%',
                bgcolor: 'info.main',
                flexShrink: 0,
                boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.info.main, 0.18)}`,
              }}
            />
          ) : null}

          {isPinned ? (
            <Iconify
              icon="solar:pin-bold"
              width={15}
              sx={{ color: 'error.main', mt: 0.5, flexShrink: 0 }}
            />
          ) : null}

          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: isUnread ? 700 : 600,
              color: 'text.primary',
              lineHeight: 1.35,
              flex: '1 1 0',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            {announcement.title}
          </Typography>

          {isUnread ? (
            <Chip
              size="small"
              label="New"
              color="info"
              sx={{
                height: 22,
                flexShrink: 0,
                fontWeight: 700,
                fontSize: '0.6875rem',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          ) : null}

          {authenticated && isUnread ? (
            <Tooltip title="Mark as read">
              <IconButton
                size="small"
                onClick={handleMarkReadClick}
                sx={{
                  flexShrink: 0,
                  color: 'info.main',
                  bgcolor: alpha(theme.palette.info.main, 0.08),
                  '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.16) },
                }}
              >
                <Iconify icon="eva:done-all-fill" width={16} />
              </IconButton>
            </Tooltip>
          ) : null}

          {authenticated && (
            <Tooltip title={isPinned ? 'Unpin' : 'Pin'}>
              <IconButton
                size="small"
                onClick={handlePinToggle}
                disabled={isPinning}
                sx={{
                  flexShrink: 0,
                  color: isPinned ? 'error.main' : 'text.disabled',
                  '&:hover': {
                    color: isPinned ? 'error.dark' : 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <Iconify icon={isPinned ? 'solar:pin-bold' : 'solar:pin-outline'} width={16} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {previewHtml ? (
          <Box sx={{ minWidth: 0, width: 1, pl: isUnread ? 2 : 0 }}>
            <Box
              ref={contentRef}
              sx={
                shouldClamp
                  ? {
                      overflow: 'hidden',
                      maxHeight: `${CLAMP_LINES * LINE_HEIGHT}em`,
                      fontSize: '0.875rem',
                      lineHeight: LINE_HEIGHT,
                    }
                  : undefined
              }
            >
              <RichTextContent
                html={previewHtml}
                listPreview={shouldClamp}
                sx={{
                  typography: 'body2',
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                  lineHeight: LINE_HEIGHT,
                  '& ol, & ul': {
                    listStylePosition: 'outside',
                    pl: 1.75,
                    my: 0.25,
                  },
                  '& li > p': { display: 'inline', m: 0 },
                  '& p': { m: 0 },
                }}
              />
            </Box>
            {showViewMore ? (
              <ButtonBase
                type="button"
                onClick={handleToggleExpand}
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.25,
                  mt: 0.5,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {expanded ? 'View less' : 'View more'}
                <Iconify
                  icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                  width={14}
                />
              </ButtonBase>
            ) : null}
          </Box>
        ) : null}

        <Stack
          direction="row"
          alignItems="center"
          flexWrap="wrap"
          gap={0.75}
          sx={{ pl: isUnread ? 2 : 0, color: 'text.disabled', typography: 'caption' }}
        >
          {creatorName ? <Box component="span">{creatorName}</Box> : null}
          {creatorName ? <Box component="span">·</Box> : null}
          <Box component="span">{formatViewCount(announcement.views)} views</Box>
          {announcement.lastActivity ? (
            <>
              <Box component="span">·</Box>
              <Box component="span">{announcement.lastActivity}</Box>
            </>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}
