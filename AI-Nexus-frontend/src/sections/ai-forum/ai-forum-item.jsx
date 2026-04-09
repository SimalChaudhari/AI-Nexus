import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import { alpha, useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { Iconify } from 'src/components/iconify';
import { UserProfilePopover } from 'src/components/user-profile-popover';
import { formatViewCount } from 'src/utils/format-view-count';
import { useAuthContext } from 'src/auth/hooks';
import { aiForumService } from 'src/services/ai-forum.service';
import { toast } from 'src/components/snackbar';
import { htmlToPlainText } from 'src/utils/html-plain-text';
import { ViewHtmlContent, RichTextContent } from 'src/components/html-content';

// ----------------------------------------------------------------------

export function AiForumItem({
  post,
  onPinToggle,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onToggleSelect,
}) {
  const theme = useTheme();
  const { user, authenticated } = useAuthContext();
  const isAuthor = user && post.userId && post.userId === user.id;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(post.isPinned || false);
  const [isPinning, setIsPinning] = useState(false);

  useEffect(() => {
    setIsPinned(post.isPinned || false);
  }, [post.isPinned]);

  const plainContentLength = htmlToPlainText(post.content || post.description || '').length;

  const handlePinToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPinning) return;

    try {
      setIsPinning(true);
      const result = await aiForumService.togglePinPost(post.id);
      setIsPinned(result.pinned);

      if (onPinToggle) {
        onPinToggle(post.id, result.pinned);
      }

      toast.success(result.message);
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error(error?.response?.data?.message || 'Failed to toggle pin');
    } finally {
      setIsPinning(false);
    }
  };

  return (
    <Box
      component={RouterLink}
      href={paths.aiForum.details(post.id)}
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        gap: { xs: 1, md: 2 },
        width: 'auto',
        flex: 1,
        minWidth: 0,
        minHeight: { xs: 120, md: 136 },
        py: 2,
        px: { xs: 1.25, md: 3 },
        textDecoration: 'none',
        borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: alpha(theme.palette.grey[500], 0.04),
        },
      }}
    >
      {/* AiForumPost Column */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {(selectable || (isAuthor && (onEdit || onDelete))) && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ display: { xs: 'flex', sm: 'none' }, mb: 0.5 }}
          >
            {selectable ? (
              <Checkbox
                size="small"
                checked={selected}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSelect?.();
                }}
                inputProps={{ 'aria-label': `select-post-${post.id}` }}
                sx={{ p: 0.25, ml: -0.25 }}
              />
            ) : (
              <Box />
            )}
            <Stack direction="row" spacing={0.25}>
              {isAuthor && onEdit && (
                <Tooltip title="Edit post">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit(post);
                    }}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      },
                    }}
                  >
                    <Iconify icon="solar:pen-bold" width={18} />
                  </IconButton>
                </Tooltip>
              )}
              {isAuthor && onDelete && (
                <Tooltip title="Delete post">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(post);
                    }}
                    sx={{
                      color: 'error.main',
                      '&:hover': {
                        color: 'error.dark',
                        bgcolor: alpha(theme.palette.error.main, 0.08),
                      },
                    }}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        )}
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 0.5 }}>
          {selectable && (
            <Checkbox
              size="small"
              checked={selected}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSelect?.();
              }}
              inputProps={{ 'aria-label': `select-post-${post.id}` }}
              sx={{ p: 0.25, mt: -0.25, display: { xs: 'none', sm: 'flex' } }}
            />
          )}
          {isPinned && <Iconify icon="solar:pin-bold" width={16} sx={{ color: 'error.main' }} />}
          <Box
            component={RouterLink}
            href={paths.aiForum.details(post.id)}
            sx={{ textDecoration: 'none', flex: 1 }}
          >
            <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              fontSize: { xs: '0.875rem', md: '0.9375rem' },
              lineHeight: 1.4,
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            {post.title}
          </Typography>
          </Box>
          {isAuthor && onEdit && (
            <Tooltip title="Edit post">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(post);
                }}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <Iconify icon="solar:pen-bold" width={18} />
              </IconButton>
            </Tooltip>
          )}
          {isAuthor && onDelete && (
            <Tooltip title="Delete post">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(post);
                }}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  color: 'error.main',
                  '&:hover': {
                    color: 'error.dark',
                    bgcolor: alpha(theme.palette.error.main, 0.08),
                  },
                }}
              >
                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
              </IconButton>
            </Tooltip>
          )}
          {authenticated && (
            <Tooltip title={isPinned ? 'Unpin post' : 'Pin post'}>
              <IconButton
                size="small"
                onClick={handlePinToggle}
                disabled={isPinning}
                sx={{
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

        {(post.excerpt || post.content) && (
          <Box sx={{ mb: 1 }}>
            {!isExpanded ? (
              <Box>
                <RichTextContent
                  html={post.content || post.description || ''}
                  clampLines={3}
                  sx={{
                    typography: 'body2',
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                    lineHeight: 1.5,
                    // Keep ordered-list markers visible in clamped list cards.
                    '& ol, & ul': {
                      listStylePosition: 'inside',
                      pl: 0,
                    },
                    '& li > p': { display: 'inline', m: 0 },
                  }}
                />
                {plainContentLength > 150 ? (
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    component={RouterLink}
                    href={paths.aiForum.details(post.id)}
                    sx={{
                      color: 'primary.main',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    read more
                  </Box>
                ) : null}
              </Box>
            ) : (
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.5 }}
              >
                <ViewHtmlContent
                  html={post.content || post.description || ''}
                  sx={{ typography: 'body2', fontSize: '0.875rem', color: 'text.secondary' }}
                />
                {plainContentLength > 150 ? (
                  <Box
                    component="span"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsExpanded(false);
                    }}
                    sx={{
                      color: 'primary.main',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-block',
                      mt: 0.5,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    show less
                  </Box>
                ) : null}
              </Box>
            )}
          </Box>
        )}

        {/* Participants - only show if we have them */}
        {post.participants && post.participants.length > 0 && (
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
            {post.participants.map((participant) => (
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

      {/* Replies Column */}
      <Box
        sx={{
          minWidth: { xs: 50, md: 70 },
          textAlign: 'center',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: 'warning.main',
            fontSize: { xs: '0.875rem', md: '1rem' },
          }}
        >
          {post.replies}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
          Replies
        </Typography>
      </Box>

      {/* Views Column */}
      <Box
        sx={{
          minWidth: { xs: 60, md: 80 },
          textAlign: 'center',
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: 'warning.main',
            fontSize: '1rem',
          }}
        >
          {formatViewCount(post.views)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
          Views
        </Typography>
      </Box>

      {/* Activity Column */}
      <Box
        sx={{
          minWidth: { xs: 50, md: 70 },
          textAlign: 'center',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: { xs: '0.75rem', md: '0.875rem' },
            fontWeight: 500,
          }}
        >
          {post.lastActivity}
        </Typography>
      </Box>
    </Box>
  );
}


