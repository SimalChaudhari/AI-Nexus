import { useState, useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { Iconify } from 'src/components/iconify';
import { UserProfilePopover } from 'src/components/user-profile-popover';
import { formatViewCount } from 'src/utils/format-view-count';
import { htmlToPlainText } from 'src/utils/html-plain-text';
import { RichTextContent } from 'src/components/html-content';
import { useAuthContext } from 'src/auth/hooks';
import { announcementService } from 'src/services/announcement.service';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export function AnnouncementItem({ announcement, onPinToggle, showBottomDivider = true }) {
  const theme = useTheme();
  const router = useRouter();
  const { authenticated } = useAuthContext();
  const [isPinned, setIsPinned] = useState(announcement.isPinned || false);
  const [isPinning, setIsPinning] = useState(false);

  useEffect(() => {
    setIsPinned(announcement.isPinned || false);
  }, [announcement.isPinned]);

  const previewHtml =
    announcement.content || announcement.description || announcement.excerpt || '';
  const plainContentLength = useMemo(
    () => htmlToPlainText(previewHtml).length,
    [previewHtml]
  );
  const showReadMore = plainContentLength > 120 || previewHtml.length > 400;

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

      if (onPinToggle) {
        onPinToggle(announcement.id, result.pinned);
      }

      toast.success(result.message);
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error(error?.response?.data?.message || 'Failed to toggle pin');
    } finally {
      setIsPinning(false);
    }
  };

  const getTypeIcon = () => {
    if (isPinned) {
      return (
        <Iconify icon="solar:pin-bold" width={16} sx={{ color: 'error.main', mt: 0.25, flexShrink: 0 }} />
      );
    }
    if (announcement.isHighlight) {
      return (
        <Iconify icon="solar:speaker-bold" width={16} sx={{ color: 'info.main', mt: 0.25, flexShrink: 0 }} />
      );
    }
    return null;
  };

  const metaPillSx = {
    px: 1.25,
    py: 0.35,
    borderRadius: 10,
    typography: 'caption',
    fontWeight: 600,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
    bgcolor: alpha(theme.palette.grey[500], 0.06),
    color: 'text.secondary',
  };

  const detailHref = paths.announcement.details(announcement.id);

  return (
    <Box
      component={RouterLink}
      href={detailHref}
      sx={{
        display: 'block',
        width: '100%',
        flex: 1,
        minWidth: 0,
        textDecoration: 'none',
        py: 2,
        px: { xs: 1.25, md: 3 },
        borderBottom: showBottomDivider
          ? `1px solid ${alpha(theme.palette.grey[500], 0.12)}`
          : 'none',
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: alpha(theme.palette.grey[500], 0.04),
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0, width: 1 }}>
          {getTypeIcon()}
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontSize: { xs: '1rem', sm: '1.0625rem' },
              lineHeight: 1.35,
              flex: '1 1 0',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              transition: 'color 0.2s ease',
              'a:hover &': {
                color: 'primary.main',
              },
            }}
          >
            {announcement.title}
          </Typography>
          {authenticated && (
            <Tooltip title={isPinned ? 'Unpin announcement' : 'Pin announcement'}>
              <IconButton
                size="small"
                onClick={handlePinToggle}
                disabled={isPinning}
                sx={{
                  flexShrink: 0,
                  ml: 'auto',
                  color: isPinned ? 'error.main' : 'text.secondary',
                  '&:hover': {
                    color: isPinned ? 'error.dark' : 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <Iconify icon={isPinned ? 'solar:pin-bold' : 'solar:pin-outline'} width={18} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {(announcement.excerpt || announcement.content || announcement.description) && (
          <Box sx={{ minWidth: 0, width: 1 }}>
            <RichTextContent
              html={previewHtml}
              clampLines={4}
              listPreview
              sx={{
                typography: 'body2',
                fontSize: '0.9375rem',
                color: 'text.secondary',
                lineHeight: 1.65,
                '& ol, & ul': {
                  listStylePosition: 'outside',
                  pl: 1.75,
                  my: 0.5,
                },
                '& li > p': { display: 'inline', m: 0 },
              }}
            />
            {showReadMore ? (
              <Box
                component="span"
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(detailHref);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(detailHref);
                  }
                }}
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'inline-block',
                  mt: 0.75,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Read more
              </Box>
            ) : null}
          </Box>
        )}

        {creatorName ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', flexShrink: 0 }}>
              {creatorName.slice(0, 2).toUpperCase()}
            </Avatar>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.45 }}>
              Created by {creatorName}
            </Typography>
          </Stack>
        ) : null}

        <Stack spacing={0.75} sx={{ pt: 0.25, width: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
            <Box component="span" sx={metaPillSx}>
              {announcement.replies} {announcement.replies === 1 ? 'reply' : 'replies'}
            </Box>
            <Box component="span" sx={metaPillSx}>
              {formatViewCount(announcement.views)} views
            </Box>
          </Stack>
          <Typography
            component="div"
            variant="caption"
            sx={{
              width: '100%',
              textAlign: 'right',
              color: 'text.disabled',
              fontWeight: 500,
              lineHeight: 1.45,
              overflow: 'visible',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {announcement.lastActivity}
          </Typography>
        </Stack>

        {announcement.participants && announcement.participants.length > 0 && (
          <AvatarGroup
            max={5}
            sx={{
              '& .MuiAvatar-root': {
                width: 24,
                height: 24,
                fontSize: '0.75rem',
                border: `2px solid ${theme.palette.background.paper}`,
              },
            }}
          >
            {announcement.participants.map((participant) => (
              <UserProfilePopover key={participant.id} user={participant}>
                <Avatar
                  alt={participant.name}
                  src={participant.avatarUrl}
                  sx={{ width: 24, height: 24 }}
                />
              </UserProfilePopover>
            ))}
          </AvatarGroup>
        )}
      </Box>
    </Box>
  );
}
