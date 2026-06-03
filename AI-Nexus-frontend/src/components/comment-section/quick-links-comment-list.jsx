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
import { RichTextContent } from 'src/components/html-content';
import { CommentRichTextComposer } from './comment-rich-text-composer';
import { CommentInlineFormActions } from './comment-inline-form-actions';
import { commentComposerFullWidthWrapSx } from './comment-composer-styles';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';

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
  /** When true, reply/edit use the TipTap editor (AI forum); comment bodies render as HTML */
  richText = false,
  /** When set (e.g. AI forum), enables image upload in reply/edit composers */
  onUploadCommentImage,
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
    const isReplying = replyingToCommentId === comment.id;
    const isEditing = editingCommentId === comment.id;
    const authorName = getCommentAuthorName ? getCommentAuthorName(comment) : comment.user?.username || 'Anonymous';
    const showActions = user && !disableLikeAndReply;

    const likeReplyBar = disableLikeAndReply ? (
      (comment.likeCount ?? 0) > 0 ? (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1, opacity: 0.85 }}>
          <Iconify
            icon="solar:like-outline"
            width={16}
            sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {comment.likeCount}
          </Typography>
        </Stack>
      ) : null
    ) : showActions ? (
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 0.5, sm: 1 }}
        flexWrap="wrap"
        useFlexGap
        sx={{ mt: 1.25, gap: { xs: 0.5, sm: 1 } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.25}
          sx={{ cursor: 'pointer', minHeight: 32 }}
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
              p: { xs: 0.5, sm: 1 },
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
        <Button
          size="small"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReplyClick?.(comment);
          }}
          sx={{
            minWidth: 'auto',
            px: { xs: 1, sm: 1.5 },
            py: 0.5,
            color: 'text.secondary',
            fontSize: { xs: '0.75rem', sm: '0.8125rem' },
            '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inline-flex' } },
          }}
        >
          Reply
        </Button>
      </Stack>
    ) : (comment.likeCount ?? 0) > 0 ? (
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
        <Iconify
          icon="solar:like-outline"
          width={16}
          sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {comment.likeCount}
        </Typography>
      </Stack>
    ) : null;

    const showOwnerActions = canEditDelete(comment);

    const commentBody =
      !isReplying && !isEditing &&
      (richText ? (
        (comment.content || '').trim() ? (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              typography: 'body2',
              fontSize: { xs: '0.875rem', sm: '0.9375rem' },
              lineHeight: 1.65,
              color: 'text.primary',
              overflow: 'visible',
              wordBreak: 'break-word',
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                maxHeight: 'min(400px, 70vh)',
                objectFit: 'contain',
                verticalAlign: 'middle',
                borderRadius: 1,
                cursor: 'pointer',
              },
              '& figure': { maxWidth: '100%' },
            }}
          >
            <RichTextContent html={(comment.content || '').trim()} clickableImages />
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled', lineHeight: 1.6 }}>
            —
          </Typography>
        )
      ) : (
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            whiteSpace: 'pre-line',
            lineHeight: 1.6,
            fontSize: { xs: '0.875rem', sm: '0.9375rem' },
            wordBreak: 'break-word',
          }}
        >
          {(comment.content || '').trim() || '—'}
        </Typography>
      ));

    return (
      <Box
        key={comment.id}
        id={`comment-${comment.id}`}
        sx={{
          display: 'block',
          borderRadius: 1.5,
          scrollMarginTop: 80,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          '&:last-child': { borderBottom: 'none' },
        }}
      >
        <Box sx={{ py: { xs: 1.5, sm: 2 }, px: { xs: 0.5, sm: 1 } }}>
          <Stack direction="row" spacing={{ xs: 1.25, sm: 1.5 }} alignItems="flex-start">
            <Avatar
              src={comment.user?.avatarUrl}
              sx={{
                width: { xs: 36, sm: isReply ? 36 : 40 },
                height: { xs: 36, sm: isReply ? 36 : 40 },
                bgcolor: 'primary.main',
                flexShrink: 0,
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
              }}
            >
              {authorName.charAt(0).toUpperCase() || '?'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 0.75 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      lineHeight: 1.35,
                      wordBreak: 'break-word',
                      display: 'block',
                    }}
                  >
                    {authorName}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', mt: 0.25, lineHeight: 1.4 }}
                  >
                    {formatRelativeTime(comment.createdAt)}
                  </Typography>
                </Box>
                {showOwnerActions && (
                  <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, mt: { xs: -0.25, sm: 0 } }}>
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
                          p: { xs: 0.75, sm: 1 },
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
                        p: { xs: 0.75, sm: 1 },
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

              {commentBody}

              {!isReplying && !isEditing && likeReplyBar}
            </Box>
          </Stack>

          {isReplying && !disableLikeAndReply && (
            <Box sx={commentComposerFullWidthWrapSx}>
              {richText ? (
                <CommentRichTextComposer
                  editorKey={`reply-${replyingToCommentId}`}
                  value={replyText || ''}
                  onChange={onReplyTextChange}
                  onUploadImage={onUploadCommentImage}
                  title={`Replying to ${authorName}`}
                  placeholder="Write a reply…"
                  secondaryLabel="Cancel"
                  submitLabel="Reply"
                  submittingLabel="Posting…"
                  onSecondary={() => onCancelReply?.()}
                  onSubmit={() => onSubmitReply?.()}
                  submitting={submittingReply}
                  showHeaderIcon={false}
                  stopPropagation
                />
              ) : (
                <>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', mb: 1, display: 'block', fontWeight: 600 }}
                  >
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
                  <CommentInlineFormActions
                    onCancel={() => onCancelReply?.()}
                    onSubmit={() => onSubmitReply?.()}
                    submitting={submittingReply}
                    submitDisabled={!replyText?.trim()}
                    submitLabel="Reply"
                    submittingLabel="Posting…"
                  />
                </>
              )}
            </Box>
          )}
          {isEditing && (
            <Box sx={commentComposerFullWidthWrapSx}>
              {richText ? (
                <CommentRichTextComposer
                  editorKey={`edit-${editingCommentId}`}
                  value={editCommentText || ''}
                  onChange={onEditCommentTextChange}
                  onUploadImage={onUploadCommentImage}
                  title="Edit comment"
                  placeholder="Edit comment…"
                  secondaryLabel="Cancel"
                  submitLabel="Update"
                  submittingLabel="Updating…"
                  onSecondary={() => onCancelEdit?.()}
                  onSubmit={() => onUpdateComment?.(comment.id)}
                  submitting={updatingComment === comment.id}
                  showHeaderIcon={false}
                  stopPropagation
                />
              ) : (
                <>
                  <TextField
                    multiline
                    rows={3}
                    value={editCommentText}
                    onChange={(e) => onEditCommentTextChange?.(e.target.value)}
                    fullWidth
                    onClick={(e) => e.stopPropagation()}
                    sx={{ mb: 1, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                  />
                  <CommentInlineFormActions
                    onCancel={() => onCancelEdit?.()}
                    onSubmit={() => onUpdateComment?.(comment.id)}
                    submitting={updatingComment === comment.id}
                    submitDisabled={!editCommentText?.trim()}
                    submitLabel="Update"
                    submittingLabel="Updating…"
                  />
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const renderReplies = (replies, depth = 0) =>
    (replies || []).map((reply) => (
      <Box
        key={reply.id}
        sx={{
          pl: { xs: 1, sm: depth > 0 ? 2 : 1.5 },
          borderLeft: { xs: `2px solid ${alpha(theme.palette.divider, 0.5)}`, sm: 'none' },
          ml: { xs: 0.5, sm: 0 },
        }}
      >
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
              <Box sx={{ pl: { xs: 1, sm: 1.5 }, mt: 0.5 }}>
                <Collapse in={repliesExpanded}>
                  <Box sx={{ pl: { xs: 0, sm: 0.5 } }}>{renderReplies(comment.replies)}</Box>
                </Collapse>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleExpanded(comment.id);
                  }}
                  sx={{
                    minWidth: 'auto',
                    px: { xs: 0.5, sm: 0 },
                    py: 0.5,
                    mt: 0.5,
                    color: 'text.secondary',
                    fontSize: { xs: '0.75rem', sm: theme.typography.pxToRem(12) },
                    textTransform: 'none',
                    '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inline-flex' }, mr: 0.5 },
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
