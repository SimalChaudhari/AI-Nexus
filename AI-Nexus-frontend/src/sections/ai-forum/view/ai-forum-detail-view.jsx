import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from 'src/components/loading/circular-progress';
import { alpha, useTheme } from '@mui/material/styles';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { QuickLinksCommentList } from 'src/components/comment-section';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { aiForumService, buildAiForumCommentTree } from 'src/services/ai-forum.service';
import { toast } from 'src/components/snackbar';
import { RichTextContent } from 'src/components/html-content';
import { useAuthContext } from 'src/auth/hooks';
import { formatViewCount } from 'src/utils/format-view-count';
import { fDateTimePersonal } from 'src/utils/format-time';
import { useAiForumCommentsSocket } from '../../../hooks/use-ai-forum-comments-socket';

// ----------------------------------------------------------------------

function getCommentAuthorName(comment) {
  const u = comment?.user;
  if (!u) return 'Anonymous';
  if (u.firstname || u.lastname) return [u.firstname, u.lastname].filter(Boolean).join(' ').trim();
  return u.username || u.email || 'Anonymous';
}

// ----------------------------------------------------------------------

export function AiForumDetailView() {
  const theme = useTheme();
  const { id } = useParams();
  const { user } = useAuthContext();
  const [post, setAiForumPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingComment, setUpdatingComment] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [deletingComment, setDeletingComment] = useState(null);
  const [deleteCommentId, setDeleteCommentId] = useState(null);
  const [likingCommentId, setLikingCommentId] = useState(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [quickLinksExpanded, setQuickLinksExpanded] = useState(() => new Set());
  const workflowMatch = (post?.description || '').match(/workflow\s*:\s*([0-9a-fA-F-]{36})/i);
  const linkedWorkflowId = workflowMatch?.[1] || null;

  // Fetch post data
  useEffect(() => {
    const fetchAiForumPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await aiForumService.getPostById(id);
        setAiForumPost(data);
      } catch (err) {
        setError(err);
        toast.error('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAiForumPost();
  }, [id]);

  // Increment view count once per session
  useEffect(() => {
    if (!id) return;

    const viewCountKey = `post_viewed_${id}`;
    const hasViewed = sessionStorage.getItem(viewCountKey);

    if (!hasViewed) {
      sessionStorage.setItem(viewCountKey, 'true');
      const incrementView = async () => {
        try {
          const updated = await aiForumService.incrementViewCount(id);
          if (post && updated?.viewCount !== undefined) {
            setAiForumPost((prev) => ({ ...prev, viewCount: updated.viewCount }));
          }
        } catch {
          sessionStorage.removeItem(viewCountKey);
        }
      };
      incrementView();
    }
  }, [id]);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoadingComments(true);
        const data = await aiForumService.getComments(id);
        setComments(data || []);
      } catch (err) {
        toast.error('Failed to load comments');
      } finally {
        setLoadingComments(false);
      }
    };

    if (id) fetchComments();
  }, [id]);

  useAiForumCommentsSocket(id, {
    onCommentAdded: (comment) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [comment, ...prev];
      });
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

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    try {
      setSubmittingComment(true);
      const newComment = await aiForumService.addComment(id, { content: commentText.trim() });
      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) return prev;
        return [newComment, ...prev];
      });
      setCommentText('');
      toast.success('Comment added successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleUpdateComment = async (commentId) => {
    if (!editCommentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      setUpdatingComment(commentId);
      const updatedComment = await aiForumService.updateComment(commentId, {
        content: editCommentText.trim(),
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updatedComment : c))
      );
      setEditingCommentId(null);
      setEditCommentText('');
      toast.success('Comment updated successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update comment');
    } finally {
      setUpdatingComment(null);
    }
  };

  const handleReplyClick = (comment) => {
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }
    setReplyingToCommentId(comment.id);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setReplyingToCommentId(null);
    setReplyText('');
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !replyingToCommentId || !user) return;

    try {
      setSubmittingReply(true);
      await aiForumService.addComment(id, {
        content: replyText.trim(),
        parentCommentId: replyingToCommentId,
      });
      setReplyingToCommentId(null);
      setReplyText('');
      toast.success('Reply posted');

      const data = await aiForumService.getComments(id);
      setComments(data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleLike = async (commentId) => {
    if (!user) {
      toast.error('Please sign in to like comments');
      return;
    }

    try {
      setLikingCommentId(commentId);
      const response = await aiForumService.toggleCommentLike(commentId);
      const commentIdStr = String(commentId);
      const liked = response?.liked ?? false;
      const likeCount = typeof response?.likeCount === 'number' ? response.likeCount : undefined;
      setComments((prev) =>
        prev.map((c) => {
          if (String(c.id) !== commentIdStr) return c;
          const nextCount =
            likeCount !== undefined ? likeCount : Math.max(0, (c.likeCount ?? 0) + (liked ? 1 : -1));
          return {
            ...c,
            likedByCurrentUser: liked,
            likeCount: nextCount,
          };
        })
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update like');
    } finally {
      setLikingCommentId(null);
    }
  };

  const handleDeleteCommentClick = (commentId) => setDeleteCommentId(commentId);
  const handleCloseDeleteConfirm = () => setDeleteCommentId(null);

  const handleConfirmDeleteComment = async () => {
    const commentId = deleteCommentId;
    setDeleteCommentId(null);
    if (!commentId) return;

    try {
      setDeletingComment(commentId);
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
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete comment');
    } finally {
      setDeletingComment(null);
    }
  };

  const formatRelativeTime = (date) => {
    return fDateTimePersonal(date) || 'Just now';
  };

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress size={60} />
        </Box>
      </DashboardContent>
    );
  }

  if (error || !post) {
    return (
      <DashboardContent>
        <Box sx={{ mx: 'auto', py: 10, textAlign: 'center' }}>
          <Iconify icon="solar:chat-round-bold-duotone" width={80} sx={{ mb: 3, opacity: 0.3 }} />
          <Typography variant="h4" sx={{ mb: 2 }}>
            Post not found
          </Typography>
          <Button
            component={RouterLink}
            href={paths.aiForum.root}
            variant="contained"
            startIcon={<Iconify icon="solar:arrow-left-bold" />}
          >
            Back to AI Forum
          </Button>
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Box
        sx={{
          width: 1,
          maxWidth: { xs: '100%', lg: 1040 },
          mx: 'auto',
        }}
      >
        <Button
          component={RouterLink}
          href={paths.aiForum.root}
          startIcon={<Iconify icon="solar:arrow-left-bold" />}
          sx={{ mb: 3 }}
        >
          Back to AI Forum
        </Button>

        <Card>
          <Box sx={{ p: { xs: 3, md: 4 } }}>
            <Typography
              variant="h3"
              sx={{
                fontSize: { xs: '1.5rem', md: '2rem' },
                fontWeight: 700,
                mb: 3,
              }}
            >
              {post.title}
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ mb: 3 }}
            >
              <Box sx={{ flex: 1 }} />

              <Stack
                direction="row"
                spacing={{ xs: 1.25, sm: 2.5 }}
                useFlexGap
                flexWrap="wrap"
                justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ minWidth: 0, flexShrink: 0 }}
                >
                  <Iconify icon="solar:chat-round-dots-bold" width={18} color="text.secondary" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {comments.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    comments
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ minWidth: 0, flexShrink: 0 }}
                >
                  <Iconify icon="solar:eye-bold" width={18} color="text.secondary" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatViewCount(post.viewCount || 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    views
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ minWidth: 0, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
                >
                  <Iconify icon="solar:clock-circle-bold" width={18} color="text.secondary" />
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', wordBreak: 'break-word' }}
                  >
                    {formatRelativeTime(post.createdAt)}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>

            <Divider />
          </Box>

          <Box sx={{ p: { xs: 3, md: 4 } }}>
            {linkedWorkflowId ? (
              <Button
                component={RouterLink}
                href={paths.workflowsDetails(linkedWorkflowId)}
                variant="outlined"
                startIcon={<Iconify icon="solar:workflow-bold-duotone" />}
                sx={{ mb: 2 }}
              >
                Open Linked Workflow Template
              </Button>
            ) : null}
            {post.description || post.content ? (
              <RichTextContent
                html={post.description || post.content}
                sx={{
                  typography: 'body1',
                  fontSize: '1rem',
                  lineHeight: 1.8,
                  color: 'text.primary',
                }}
              />
            ) : (
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                No content available
              </Typography>
            )}
          </Box>
        </Card>

        {/* Comments Section */}
        <Card sx={{ mt: 3 }}>
          <Box sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
              Comments ({comments.length})
            </Typography>

            {loadingComments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={40} />
              </Box>
            ) : comments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No comments yet.
              </Typography>
            ) : (
              <QuickLinksCommentList
                commentTree={buildAiForumCommentTree(comments)}
                announcementId={id}
                linkBase={paths.aiForum.details(id)}
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
                onToggleLike={handleToggleLike}
                likingCommentId={likingCommentId}
                onReplyClick={handleReplyClick}
                replyingToCommentId={replyingToCommentId}
                replyText={replyText}
                onReplyTextChange={setReplyText}
                onCancelReply={handleCancelReply}
                onSubmitReply={handleReplySubmit}
                submittingReply={submittingReply}
                editingCommentId={editingCommentId}
                editCommentText={editCommentText}
                onEditCommentTextChange={setEditCommentText}
                onEditComment={handleEditComment}
                onCancelEdit={handleCancelEdit}
                onUpdateComment={handleUpdateComment}
                updatingComment={updatingComment}
                onDeleteComment={handleDeleteCommentClick}
                deletingComment={deletingComment}
              />
            )}

            <Divider sx={{ my: 3 }} />

            {user ? (
              <Box>
                <Stack spacing={2}>
                  <TextField
                    multiline
                    rows={4}
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                  />
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onClick={() => setCommentText('')}
                      disabled={submittingComment}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSubmitComment}
                      disabled={submittingComment || !commentText.trim()}
                      startIcon={submittingComment ? <CircularProgress size={16} /> : null}
                    >
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ) : (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  textAlign: 'center',
                }}
              >
                <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
                  Please sign in to comment
                </Typography>
                <Button
                  component={RouterLink}
                  href={paths.auth.simple.signIn}
                  variant="contained"
                  startIcon={<Iconify icon="solar:login-2-bold" />}
                >
                  Sign In
                </Button>
              </Box>
            )}

            <ConfirmDialog
              open={Boolean(deleteCommentId)}
              onClose={handleCloseDeleteConfirm}
              title="Delete comment"
              content="Are you sure you want to delete this comment? This cannot be undone."
              action={
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleConfirmDeleteComment}
                  disabled={deletingComment !== null}
                >
                  Delete
                </Button>
              }
            />
          </Box>
        </Card>
      </Box>
    </DashboardContent>
  );
}




