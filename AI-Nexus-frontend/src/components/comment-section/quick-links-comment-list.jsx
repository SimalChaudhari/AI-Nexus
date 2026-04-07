import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from 'src/components/loading/circular-progress';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------
// Comment-style list: avatar, name, time, like + reply + edit/delete, content.
// Expand/collapse for replies with "X replies" / "Hide replies" at end.
// ----------------------------------------------------------------------

export function QuickLinksCommentList({
  commentTree,
  announcementId,
  /** If provided, comment links use this base (e.g. admin detail URL); otherwise public announcement URL */
  linkBase,
  formatRelativeTime,
  getCommentAuthorName,
  expanded,
  onToggleExpanded,
  user,
  onToggleLike,
  likingCommentId,
  onReplyClick,
  replyingToCommentId,
  replyText,
  onReplyTextChange,
  onCancelReply,
  onSubmitReply,
  submittingReply,
  editingCommentId,
  editCommentText,
  onEditCommentTextChange,
  onEditComment,
  onCancelEdit,
  onUpdateComment,
  updatingComment,
  onDeleteComment,
  deletingComment,
  /** When true, show edit/delete on every comment (e.g. admin view) */
  showEditDeleteForAll = false,
  /** When true, like and reply are disabled (e.g. admin panel - admin cannot like or reply) */
  disableLikeAndReply = false,
}) {
  const theme = useTheme();

  const canEditDelete = (comment) =>
    showEditDeleteForAll || (user && (comment.userId === user.id || user.role === 'admin'));

  const totalReplyCount = (comment) => {
    const direct = comment.replies?.length ?? 0;
    if (direct === 0) return 0;
    return direct + (comment.replies || []).reduce((sum, r) => sum + totalReplyCount(r), 0);
  };
  const hasReplies = (comment) => comment.replies && comment.replies.length > 0;

  const renderCommentBlock = (comment, isReply = false) => {
    const href = linkBase
      ? `${linkBase.replace(/#.*$/, '')}#comment-${comment.id}`
      : `${paths.announcements}/${announcementId || ''}#comment-${comment.id}`;
    const isReplying = replyingToCommentId === comment.id;
    const isEditing = editingCommentId === comment.id;
    const authorName = getCommentAuthorName ? getCommentAuthorName(comment) : comment.user?.username || 'Anonymous';
    return (
      <Box
        key={comment.id}
        component={RouterLink}
        href={href}
        sx={{
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
          borderRadius: 1,
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
        }}
      >
        <Box sx={{ p: isReply ? 1.25 : 1.5 }}>
          <Stack direction="row" spacing={isReply ? 1.25 : 1.5} alignItems="flex-start">
            <Avatar
              src={comment.user?.avatarUrl}
              sx={{
                width: isReply ? 32 : 40,
                height: isReply ? 32 : 40,
                bgcolor: 'primary.main',
                flexShrink: 0,
              }}
            >
              {authorName.charAt(0).toUpperCase() || '?'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {authorName}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatRelativeTime(comment.createdAt)}
                </Typography>
                {canEditDelete(comment) && (
                  <Stack direction="row" spacing={0.5} sx={{ ml: 'auto' }}>
                    {!isEditing && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEditComment?.(comment);
                        }}
                        disabled={deletingComment === comment.id || updatingComment === comment.id}
                        sx={{
                          color: 'primary.main',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                        }}
                      >
                        <Iconify icon="solar:pen-bold" width={18} />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteComment?.(comment.id);
                      }}
                      disabled={deletingComment === comment.id || updatingComment === comment.id}
                      sx={{
                        color: 'error.main',
                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) },
                      }}
                    >
                      {deletingComment === comment.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      )}
                    </IconButton>
                  </Stack>
                )}
              </Stack>
              {user ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                  {disableLikeAndReply ? (
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ opacity: 0.7 }}>
                      <Iconify icon="solar:like-outline" width={18} sx={{ color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {comment.likeCount ?? 0}
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.5}
                      sx={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleLike?.(comment.id);
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleLike?.(comment.id);
                        }}
                        disabled={likingCommentId === comment.id}
                        sx={{
                          color: comment.likedByCurrentUser ? 'primary.main' : 'text.secondary',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                        }}
                      >
                        {likingCommentId === comment.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Iconify
                            icon={comment.likedByCurrentUser ? 'solar:like-bold' : 'solar:like-outline'}
                            width={18}
                          />
                        )}
                      </IconButton>
                      <Typography
                        variant="caption"
                        sx={{
                          color: comment.likedByCurrentUser ? 'primary.main' : 'text.secondary',
                          fontWeight: comment.likedByCurrentUser ? 600 : 400,
                        }}
                      >
                        {comment.likeCount ?? 0}
                      </Typography>
                    </Stack>
                  )}
                  {disableLikeAndReply ? (
                    <Button
                      size="small"
                      startIcon={<Iconify icon="solar:reply-outline" width={16} />}
                      disabled
                      sx={{ minWidth: 'auto', px: 1, color: 'text.secondary', opacity: 0.7 }}
                    >
                      Reply
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      startIcon={<Iconify icon="solar:reply-outline" width={16} />}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onReplyClick?.(comment);
                      }}
                      sx={{ minWidth: 'auto', px: 1, color: 'text.secondary' }}
                    >
                      Reply
                    </Button>
                  )}
                </Stack>
              ) : (
                (comment.likeCount ?? 0) > 0 && (
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
                    <Iconify icon="solar:like-outline" width={16} sx={{ color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {comment.likeCount}
                    </Typography>
                  </Stack>
                )
              )}
              {isReplying && !disableLikeAndReply && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                    Replying to {authorName}
                  </Typography>
                  <TextField
                    multiline
                    rows={2}
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => onReplyTextChange?.(e.target.value)}
                    fullWidth
                    onClick={(e) => e.stopPropagation()}
                    sx={{ mb: 1, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCancelReply?.();
                      }}
                      disabled={submittingReply}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSubmitReply?.();
                      }}
                      disabled={submittingReply || !replyText?.trim()}
                      startIcon={submittingReply ? <CircularProgress size={14} /> : null}
                    >
                      {submittingReply ? 'Posting...' : 'Reply'}
                    </Button>
                  </Stack>
                </Box>
              )}
              {isEditing && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    multiline
                    rows={3}
                    value={editCommentText}
                    onChange={(e) => onEditCommentTextChange?.(e.target.value)}
                    fullWidth
                    onClick={(e) => e.stopPropagation()}
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                  />
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCancelEdit?.();
                      }}
                      disabled={updatingComment === comment.id}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onUpdateComment?.(comment.id);
                      }}
                      disabled={updatingComment === comment.id || !editCommentText?.trim()}
                      startIcon={updatingComment === comment.id ? <CircularProgress size={14} /> : null}
                    >
                      {updatingComment === comment.id ? 'Updating...' : 'Update'}
                    </Button>
                  </Stack>
                </Box>
              )}
              {!isReplying && !isEditing && (
                <Typography
                  variant="body2"
                  sx={{ color: 'text.primary', whiteSpace: 'pre-line', lineHeight: 1.6 }}
                >
                  {(comment.content || '').trim() || '—'}
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
      </Box>
    );
  };

  const renderReplies = (replies, depth = 0) =>
    (replies || []).map((reply) => (
      <Box key={reply.id} sx={{ pl: depth > 0 ? 2 : 1.5 }}>
        {renderCommentBlock(reply, true)}
        {hasReplies(reply) && (
          <Box sx={{ pl: 1.5 }}>
            {renderReplies(reply.replies, depth + 1)}
          </Box>
        )}
      </Box>
    ));

  return (
    <Stack sx={{ gap: 0 }}>
      {(commentTree || []).map((comment) => {
        const repliesExpanded = expanded.has(comment.id);
        const count = totalReplyCount(comment);
        return (
          <Box key={comment.id}>
            {renderCommentBlock(comment, false)}
            {hasReplies(comment) && (
              <Box sx={{ pl: 1.5, mt: 0.5 }}>
                <Collapse in={repliesExpanded}>
                  <Box sx={{ pl: 0.5 }}>{renderReplies(comment.replies)}</Box>
                </Collapse>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleExpanded(comment.id);
                  }}
                  startIcon={
                    <Iconify
                      icon={repliesExpanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                      width={16}
                      sx={{ color: 'text.secondary' }}
                    />
                  }
                  sx={{
                    minWidth: 'auto',
                    px: 0,
                    py: 0.5,
                    mt: 0.5,
                    color: 'text.secondary',
                    fontSize: theme.typography.pxToRem(12),
                    textTransform: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
                  }}
                >
                  {repliesExpanded ? 'Hide replies' : `${count} ${count === 1 ? 'reply' : 'replies'}`}
                </Button>
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
