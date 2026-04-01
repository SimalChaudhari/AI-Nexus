import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { QuickLinksCommentList } from '../../../../components/comment-section';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { fDateTime, fDateTimePersonal } from 'src/utils/format-time';
import { aiForumService, buildAiForumCommentTree } from 'src/services/ai-forum.service';
import { toast } from 'src/components/snackbar';
import { RichTextContent } from 'src/components/html-content';
import { useAuthContext } from 'src/auth/hooks';
import { useAiForumCommentsSocket } from '../../../../hooks/use-ai-forum-comments-socket';

function getCommentAuthorName(comment) {
  const user = comment?.user;
  if (!user) return 'Anonymous';
  if (user.firstname || user.lastname) {
    return [user.firstname, user.lastname].filter(Boolean).join(' ').trim();
  }
  return user.username || user.email || 'Anonymous';
}

function formatRelativeTime(date) {
  return fDateTimePersonal(date) || '';
}

export function AiForumDetailsView({ post, loading, error, onAiForumPostUpdate }) {
  const { user } = useAuthContext();
  const [comments, setComments] = useState(post?.comments || []);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [deleteCommentId, setDeleteCommentId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [updatingComment, setUpdatingComment] = useState(null);
  const [quickLinksExpanded, setQuickLinksExpanded] = useState(() => new Set());

  useEffect(() => {
    setComments(post?.comments || []);
  }, [post?.comments, post?.id]);

  useAiForumCommentsSocket(post?.id, {
    onCommentAdded: (comment) => {
      setComments((prev) => [comment, ...prev]);
    },
    onCommentUpdated: (comment) => {
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? comment : c))
      );
    },
    onCommentDeleted: (payload) => {
      const ids = new Set(payload.deletedIds || [payload.commentId]);
      setComments((prev) => prev.filter((c) => !ids.has(c.id)));
    },
    onCommentLikeToggled: (payload) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === payload.commentId
            ? { ...c, likeCount: payload.likeCount, likedByCurrentUser: payload.liked }
            : c
        )
      );
    },
  });

  const handleDeleteCommentClick = (commentId) => setDeleteCommentId(commentId);
  const handleCloseDeleteConfirm = () => setDeleteCommentId(null);

  const handleConfirmDeleteComment = async () => {
    const commentId = deleteCommentId;
    setDeleteCommentId(null);
    if (!commentId) return;
    try {
      setDeletingCommentId(commentId);
      await aiForumService.deleteComment(commentId);
      setComments((prev) => {
        const toRemove = new Set([commentId]);
        let added = 1;
        while (added > 0) {
          added = 0;
          for (let i = 0; i < prev.length; i += 1) {
            const c = prev[i];
            if (c.parentCommentId && toRemove.has(c.parentCommentId) && !toRemove.has(c.id)) {
              toRemove.add(c.id);
              added += 1;
            }
          }
        }
        return prev.filter((c) => !toRemove.has(c.id));
      });
      toast.success('Comment deleted successfully');
      onAiForumPostUpdate?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content || '');
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleUpdateComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      setUpdatingComment(commentId);
      const updated = await aiForumService.updateComment(commentId, { content: editCommentText.trim() });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: updated?.content ?? editCommentText.trim() } : c))
      );
      setEditingCommentId(null);
      setEditCommentText('');
      toast.success('Comment updated');
      onAiForumPostUpdate?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update comment');
    } finally {
      setUpdatingComment(null);
    }
  };

  if (loading) return <LoadingScreen />;

  if (error || !post) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Post not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.aiForum.list}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Post details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Forum', href: paths.admin.aiForum.list },
          { name: post?.title },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.aiForum.edit(post?.id)}
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
          >
            Edit
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Post information
            </Typography>

            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Title</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{post.title || '-'}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>View Count</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{post.viewCount || 0}</Typography>
              </Box>

              <Box sx={{ gridColumn: 'span 2' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Description
                </Typography>
                {post.description ? (
                  <RichTextContent html={post.description} sx={{ color: 'text.secondary' }} />
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    -
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Created At</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {post.createdAt ? fDateTime(post.createdAt, 'DD MMM YYYY h:mm A') : '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Updated At</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {post.updatedAt ? fDateTime(post.updatedAt, 'DD MMM YYYY h:mm A') : '-'}
                </Typography>
              </Box>
            </Box>
          </Card>

          <Card sx={{ mt: 3, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Comments ({comments.length})</Typography>

            {comments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Iconify icon="solar:chat-round-dots-bold-duotone" width={64} sx={{ mb: 2, opacity: 0.3, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>No comments yet</Typography>
              </Box>
            ) : (
              <QuickLinksCommentList
                commentTree={buildAiForumCommentTree(comments)}
                announcementId={post.id}
                linkBase={paths.admin.aiForum.details(post.id)}
                formatRelativeTime={formatRelativeTime}
                getCommentAuthorName={getCommentAuthorName}
                expanded={quickLinksExpanded}
                onToggleExpanded={(commentId) => {
                  setQuickLinksExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(commentId)) next.delete(commentId);
                    else next.add(commentId);
                    return next;
                  });
                }}
                user={user}
                showEditDeleteForAll
                disableLikeAndReply
                editingCommentId={editingCommentId}
                editCommentText={editCommentText}
                onEditCommentTextChange={setEditCommentText}
                onEditComment={handleEditComment}
                onCancelEdit={handleCancelEdit}
                onUpdateComment={handleUpdateComment}
                updatingComment={updatingComment}
                onDeleteComment={handleDeleteCommentClick}
                deletingComment={deletingCommentId}
              />
            )}

            <ConfirmDialog
              open={Boolean(deleteCommentId)}
              onClose={handleCloseDeleteConfirm}
              title="Delete comment"
              content="Are you sure you want to delete this comment? This cannot be undone."
              action={
                <Button variant="contained" color="error" onClick={handleConfirmDeleteComment} disabled={deletingCommentId !== null}>
                  Delete
                </Button>
              }
            />
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}


