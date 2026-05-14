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
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { Iconify } from 'src/components/iconify';
import { UserProfilePopover } from 'src/components/user-profile-popover';
import { formatViewCount } from 'src/utils/format-view-count';
import { useAuthContext } from 'src/auth/hooks';
import { aiForumService } from 'src/services/ai-forum.service';
import { toast } from 'src/components/snackbar';
import { htmlToPlainText } from 'src/utils/html-plain-text';
import { RichTextContent } from 'src/components/html-content';

// ----------------------------------------------------------------------

export function AiForumItem({
  post,
  onPinToggle,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onToggleSelect,
  showBottomDivider = true,
}) {
  const theme = useTheme();
  const router = useRouter();
  const { user, authenticated } = useAuthContext();
  const isAuthor = user && post.userId && post.userId === user.id;
  const [isPinned, setIsPinned] = useState(post.isPinned || false);
  const [isPinning, setIsPinning] = useState(false);

  useEffect(() => {
    setIsPinned(post.isPinned || false);
  }, [post.isPinned]);

  const previewHtml = post.content || post.description || '';
  const plainContentLength = htmlToPlainText(previewHtml).length;
  /** Preview truncates with ellipsis; full post on detail page. */
  const showReadMore = plainContentLength > 120 || previewHtml.length > 400;

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

  const detailHref = paths.aiForum.details(post.id);

  const handleRowNavigate = (e) => {
    if (e.defaultPrevented) return;
    const el = e.target;
    if (typeof el?.closest !== 'function') return;
    if (el.closest('button, input, textarea, select, a, [data-skip-row-nav]')) {
      return;
    }
    // Inner controls (e.g. "Read more") use role="link" — must not match the row container.
    const nestedLink = el.closest('[role="link"]');
    if (nestedLink && nestedLink !== e.currentTarget) {
      return;
    }
    router.push(detailHref);
  };

  const handleRowKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target;
    if (el !== e.currentTarget) return;
    e.preventDefault();
    router.push(detailHref);
  };

  return (
    <Box
      tabIndex={0}
      role="group"
      aria-label={`Post: ${post.title || 'Untitled'}`}
      onClick={handleRowNavigate}
      onKeyDown={handleRowKeyDown}
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
        cursor: 'pointer',
        outline: 'none',
        '&:hover': {
          bgcolor: alpha(theme.palette.grey[500], 0.04),
        },
        '&:focus-visible': {
          boxShadow: (t) => `0 0 0 2px ${alpha(t.palette.primary.main, 0.25)}`,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
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
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onChange={(e) => {
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
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0, width: 1 }}>
          {selectable && (
            <Checkbox
              size="small"
              checked={selected}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect?.();
              }}
              inputProps={{ 'aria-label': `select-post-${post.id}` }}
              sx={{ p: 0.25, mt: -0.25, display: { xs: 'none', sm: 'flex' }, flexShrink: 0 }}
            />
          )}
          {isPinned && (
            <Iconify
              icon="solar:pin-bold"
              width={16}
              sx={{ color: 'error.main', mt: 0.25, flexShrink: 0 }}
            />
          )}
          <Typography
            component={RouterLink}
            href={detailHref}
            variant="subtitle1"
            className="forum-post-title"
            onClick={(e) => e.stopPropagation()}
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontSize: { xs: '1rem', sm: '1.0625rem' },
              lineHeight: 1.35,
              flex: '1 1 0',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            {post.title}
          </Typography>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, ml: 'auto' }}>
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
        </Stack>

        {(post.excerpt || post.content) && (
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
                  router.push(paths.aiForum.details(post.id));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(paths.aiForum.details(post.id));
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

        <Stack spacing={0.75} sx={{ pt: 0.25, width: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
            <Box
              component={RouterLink}
              href={detailHref}
              onClick={(e) => e.stopPropagation()}
              sx={{
                ...metaPillSx,
                textDecoration: 'none',
                display: 'inline-block',
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                },
              }}
            >
               {post.replies} {post.replies === 1 ? 'reply' : 'replies'}
            </Box>
            <Box component="span" sx={metaPillSx}>
              {formatViewCount(post.views)} views
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
            {post.lastActivity}
          </Typography>
        </Stack>

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
    </Box>
  );
}


