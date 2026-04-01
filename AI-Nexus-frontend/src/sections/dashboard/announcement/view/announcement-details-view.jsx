import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

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
import { announcementService, buildAnnouncementCommentTree } from 'src/services/announcement.service';
import { toast } from 'src/components/snackbar';
import { ViewHtmlContent } from 'src/components/html-content';
import { useAuthContext } from 'src/auth/hooks';
import { useAnnouncementCommentsSocket } from '../../../../hooks/use-announcement-comments-socket';

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

function formatRelativeTime(date) {
  return fDateTimePersonal(date) || '';
}

// ----------------------------------------------------------------------

export function AnnouncementDetailsView({ announcement, loading, error, onAnnouncementUpdate }) {
  const { user } = useAuthContext();
  const [comments, setComments] = useState(announcement?.comments || []);
  const [loadingComments, setLoadingComments] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [deleteCommentId, setDeleteCommentId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [updatingComment, setUpdatingComment] = useState(null);
  const [quickLinksExpanded, setQuickLinksExpanded] = useState(() => new Set());
  const creator = getAnnouncementCreator(announcement);

  useEffect(() => {
    setComments(announcement?.comments || []);
  }, [announcement?.comments, announcement?.id]);

  useEffect(() => {
    if (!announcement?.id) return () => {};
    let cancelled = false;
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const data = await announcementService.getComments(announcement.id);
        if (!cancelled) setComments(data || []);
      } catch (err) {
        if (!cancelled) toast.error('Failed to load comments');
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    };
    fetchComments();
    return () => { cancelled = true; };
  }, [announcement?.id]);

  useAnnouncementCommentsSocket(announcement?.id, {
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
  });

  const handleDeleteCommentClick = (commentId) => setDeleteCommentId(commentId);
  const handleCloseDeleteConfirm = () => setDeleteCommentId(null);

  const handleConfirmDeleteComment = async () => {
    const commentId = deleteCommentId;
    setDeleteCommentId(null);
    if (!commentId) return;
    try {
      setDeletingCommentId(commentId);
      await announcementService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Comment deleted successfully');
      onAnnouncementUpdate?.();
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
      const updated = await announcementService.updateComment(commentId, { content: editCommentText.trim() });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: updated?.content ?? editCommentText.trim() } : c))
      );
      setEditingCommentId(null);
      setEditCommentText('');
      toast.success('Comment updated');
      onAnnouncementUpdate?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update comment');
    } finally {
      setUpdatingComment(null);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !announcement) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Announcement not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.announcement.list}
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
        heading="Announcement Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Announcement', href: paths.admin.announcement.list },
          { name: announcement?.title },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.announcement.edit(announcement?.id)}
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
              Announcement Information
            </Typography>

            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Title
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {announcement.title || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  View Count
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {announcement.viewCount || 0}
                </Typography>
              </Box>

              {creator && (
                <Box sx={{ gridColumn: 'span 2' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Created By
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>{creator.initials}</Avatar>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {creator.name}
                    </Typography>
                  </Stack>
                </Box>
              )}

              <Box sx={{ gridColumn: 'span 2' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Description
                </Typography>
                {announcement.description ? (
                  <ViewHtmlContent html={announcement.description} sx={{ color: 'text.secondary' }} />
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    -
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Created At
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {announcement.createdAt ? fDateTime(announcement.createdAt, 'DD MMM YYYY h:mm A') : '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Updated At
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {announcement.updatedAt ? fDateTime(announcement.updatedAt, 'DD MMM YYYY h:mm A') : '-'}
                </Typography>
              </Box>
            </Box>
          </Card>

          <Card sx={{ mt: 3, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Comments ({comments.length})
            </Typography>

            {loadingComments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading comments...</Typography>
              </Box>
            ) : comments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Iconify
                  icon="solar:chat-round-dots-bold-duotone"
                  width={64}
                  sx={{ mb: 2, opacity: 0.3, color: 'text.secondary' }}
                />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No comments yet
                </Typography>
              </Box>
            ) : (
              <QuickLinksCommentList
                commentTree={buildAnnouncementCommentTree(comments)}
                announcementId={announcement.id}
                linkBase={paths.admin.announcement.details(announcement.id)}
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
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleConfirmDeleteComment}
                  disabled={deletingCommentId !== null}
                >
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
