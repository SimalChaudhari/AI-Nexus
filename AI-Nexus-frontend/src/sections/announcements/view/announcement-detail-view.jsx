import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from 'src/components/loading/circular-progress';
import { alpha, useTheme } from '@mui/material/styles';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { QuickLinksCommentList } from 'src/components/comment-section';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { announcementService, buildAnnouncementCommentTree } from 'src/services/announcement.service';
import { toast } from 'src/components/snackbar';
import { useAuthContext } from 'src/auth/hooks';
import { formatViewCount } from 'src/utils/format-view-count';
import { fDateTimePersonal } from 'src/utils/format-time';
import { useAnnouncementCommentsSocket } from '../../../hooks/use-announcement-comments-socket';
import { useAnnouncementsListSocket } from 'src/hooks/use-announcements-list-socket';
import { RichTextContent } from 'src/components/html-content';

// ----------------------------------------------------------------------

function getCommentAuthorName(comment) {
  const u = comment?.user;
  if (!u) return 'Anonymous';
  if (u.firstname || u.lastname) return [u.firstname, u.lastname].filter(Boolean).join(' ').trim();
  return u.username || u.email || 'Anonymous';
}

function getAnnouncementCreator(announcement) {
  const user = announcement?.createdBy;
  if (!user) return null;
  const name = [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || user.username || user.email;
  if (!name) return null;
  return {
    name,
    initials: name.slice(0, 2).toUpperCase(),
  };
}

// ----------------------------------------------------------------------

export function AnnouncementDetailView() {
  const theme = useTheme();
  const { id } = useParams();
  const { user } = useAuthContext();
  const [announcement, setAnnouncement] = useState(null);
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
  const [quickLinksExpanded, setQuickLinksExpanded] = useState(() => new Set());
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const recentlyAddedCommentIdsRef = useRef(new Set());

  const fetchAnnouncement = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await announcementService.getAnnouncementById(id);
      setAnnouncement(data);
    } catch (err) {
      setError(err);
      toast.error('Failed to load announcement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchAnnouncement();
  }, [id, fetchAnnouncement]);

  useAnnouncementsListSocket(
    {
      onAnnouncementUpdated: (a) => {
        if (a?.id === id) fetchAnnouncement();
      },
      onAnnouncementDeleted: (payload) => {
        if (payload?.announcementId === id) {
          setAnnouncement(null);
          setError(new Error('Announcement deleted'));
        }
      },
    },
    { enabled: !!id }
  );

  // Increment view count only once when detail page is viewed
  useEffect(() => {
    if (!id) {
      // console.log('View count increment skipped - missing id');
      return;
    }

    // Check if view count has already been incremented for this announcement in this session
    const viewCountKey = `announcement_viewed_${id}`;
    const hasViewed = sessionStorage.getItem(viewCountKey);

    if (!hasViewed) {
      // console.log('Incrementing view count for announcement:', id);
      // Mark as viewed in session storage to prevent multiple increments
      sessionStorage.setItem(viewCountKey, 'true');

      // Increment view count - don't wait for announcement to load
      const incrementView = async () => {
        try {
          // console.log('Calling incrementViewCount API for:', id);
          const updatedAnnouncement = await announcementService.incrementViewCount(id);
          // console.log('View count incremented successfully:', updatedAnnouncement);

          // Update the announcement state with new view count if announcement is already loaded
          if (announcement && updatedAnnouncement && updatedAnnouncement.viewCount !== undefined) {
            setAnnouncement((prev) => ({
              ...prev,
              viewCount: updatedAnnouncement.viewCount,
            }));
            // console.log('Updated view count in state:', updatedAnnouncement.viewCount);
          }
        } catch (viewError) {
          // Log error but don't break the page
          // console.error('Failed to increment view count:', viewError);
          // console.error('Error response:', viewError?.response?.data);
          // console.error('Error status:', viewError?.response?.status);
          // Remove from sessionStorage so it can be retried
          sessionStorage.removeItem(viewCountKey);
        }
      };

      incrementView();
    } else {
      // console.log('View count already incremented for this announcement in this session');
    }
  }, [id]); // Only depend on id, not announcement

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoadingComments(true);
        const data = await announcementService.getComments(id);
        setComments(data || []);
      } catch (err) {
        // console.error('Error fetching comments:', err);
        toast.error('Failed to load comments');
      } finally {
        setLoadingComments(false);
      }
    };

    if (id) {
      fetchComments();
    }
  }, [id]);

  useAnnouncementCommentsSocket(id, {
    onCommentAdded: (comment) => {
      if (recentlyAddedCommentIdsRef.current.has(comment.id)) {
        recentlyAddedCommentIdsRef.current.delete(comment.id);
        return;
      }
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
  });

  // Handle comment submit (users can post multiple comments)
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
      const newComment = await announcementService.addComment(id, {
        content: commentText.trim(),
      });

      recentlyAddedCommentIdsRef.current.add(newComment.id);
      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) return prev;
        return [newComment, ...prev];
      });
      setCommentText('');
      toast.success('Comment added successfully');
    } catch (err) {
      // console.error('Error adding comment:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to add comment';
      toast.error(errorMessage);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle edit comment
  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  // Handle update comment
  const handleUpdateComment = async (commentId) => {
    if (!editCommentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      setUpdatingComment(commentId);
      const updatedComment = await announcementService.updateComment(commentId, {
        content: editCommentText.trim(),
      });

      // Update comment in list
      setComments((prev) =>
        prev.map((comment) => (comment.id === commentId ? updatedComment : comment))
      );
      setEditingCommentId(null);
      setEditCommentText('');
      toast.success('Comment updated successfully');
    } catch (err) {
      // console.error('Error updating comment:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update comment';
      toast.error(errorMessage);
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
      await announcementService.addComment(id, {
        content: replyText.trim(),
        parentCommentId: replyingToCommentId,
      });
      setReplyingToCommentId(null);
      setReplyText('');
      toast.success('Reply posted');

      const data = await announcementService.getComments(id);
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
      await announcementService.toggleCommentLike(commentId);
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          const wasLiked = c.likedByCurrentUser ?? false;
          const currentCount = c.likeCount ?? 0;
          return {
            ...c,
            likedByCurrentUser: !wasLiked,
            likeCount: wasLiked ? currentCount - 1 : currentCount + 1,
          };
        })
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update like');
    } finally {
      setLikingCommentId(null);
    }
  };

  const handleDeleteCommentClick = (comment) => setDeleteCommentId(comment?.id ?? comment);
  const handleCloseDeleteConfirm = () => setDeleteCommentId(null);

  const handleConfirmDeleteComment = async () => {
    const commentId = deleteCommentId;
    setDeleteCommentId(null);
    if (!commentId) return;

    try {
      setDeletingComment(commentId);
      await announcementService.deleteComment(commentId);
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
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete comment';
      toast.error(errorMessage);
    } finally {
      setDeletingComment(null);
    }
  };

  const formatPersonalDateTime = (date) => fDateTimePersonal(date) || 'Unknown time';
  const creator = getAnnouncementCreator(announcement);

  // Loading state
  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress size={60} />
        </Box>
      </DashboardContent>
    );
  }

  // Error state or not found
  if (error || !announcement) {
    return (
      <DashboardContent>
        <Box sx={{ mx: 'auto', py: 10, textAlign: 'center' }}>
          <Iconify icon="solar:file-text-bold-duotone" width={80} sx={{ mb: 3, opacity: 0.3 }} />
          <Typography variant="h4" sx={{ mb: 2 }}>
            Announcement Not Found
          </Typography>
          <Button
            component={RouterLink}
            href={paths.announcements}
            variant="contained"
            startIcon={<Iconify icon="solar:arrow-left-bold" />}
          >
            Back to Announcements
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
        {/* Back Button */}
        <Button
          component={RouterLink}
          href={paths.announcements}
          startIcon={<Iconify icon="solar:arrow-left-bold" />}
          sx={{ mb: 3 }}
        >
          Back to Announcements
        </Button>

        <Card sx={{ overflow: 'visible' }}>
          {/* Header */}
          <Box sx={{ p: { xs: 3, md: 4 } }}>
            {/* Title */}
            <Typography
              variant="h3"
              sx={{
                fontSize: { xs: '1.5rem', md: '2rem' },
                fontWeight: 700,
                mb: 3,
              }}
            >
              {announcement.title}
            </Typography>

            {/* Meta Info */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ mb: 3 }}
            >
              {creator && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>{creator.initials}</Avatar>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Created by {creator.name}
                  </Typography>
                </Stack>
              )}
              <Box sx={{ flex: 1 }} />

              {/* Stats */}
              <Stack direction="row" spacing={3}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Iconify icon="solar:chat-round-dots-bold" width={18} color="text.secondary" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {comments.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    comments
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Iconify icon="solar:eye-bold" width={18} color="text.secondary" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatViewCount(announcement.viewCount || 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    views
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Iconify icon="solar:clock-circle-bold" width={18} color="text.secondary" />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {formatPersonalDateTime(announcement.createdAt)}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>

            <Divider />
          </Box>

          {/* Content */}
          <Box sx={{ p: { xs: 3, md: 4 }, overflow: 'visible', minWidth: 0 }}>
            {announcement.description || announcement.content ? (
              <RichTextContent
                html={announcement.description || announcement.content}
                sx={{
                  typography: 'body1',
                  fontSize: '1rem',
                  lineHeight: 1.8,
                  color: 'text.primary',
                  overflow: 'visible',
                  '& img': {
                    maxWidth: '100%',
                    height: 'auto',
                    maxHeight: 'min(560px, 78vh)',
                    objectFit: 'contain',
                    verticalAlign: 'middle',
                    borderRadius: 1.5,
                  },
                  '& figure': {
                    maxWidth: '100%',
                  },
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

            <Divider sx={{ mb: 3 }} />

            {/* Comments List - same layout as post detail (QuickLinksCommentList) */}
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
                commentTree={buildAnnouncementCommentTree(comments)}
                announcementId={id}
                linkBase={paths.announcement.details(id)}
                formatRelativeTime={formatPersonalDateTime}
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

            {/* Comment Form - users can post multiple comments (kept below list like AI Forum) */}
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.paper',
                      },
                    }}
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

