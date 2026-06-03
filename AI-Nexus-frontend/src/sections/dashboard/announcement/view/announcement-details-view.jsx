import { useState, useEffect, useCallback } from 'react';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { Box } from '@mui/material';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';
import { QuickLinksCommentList } from '../../../../components/comment-section';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { fDateTime, fDateTimePersonal } from 'src/utils/format-time';
import { announcementService, buildAnnouncementCommentTree } from 'src/services/announcement.service';
import { toast } from 'src/components/snackbar';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
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

  const handleCommentMediaUpload = useCallback(async (file) => {
    try {
      return await announcementService.uploadAnnouncementMedia(file);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Media upload failed');
      return '';
    }
  }, []);

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content || '');
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleUpdateComment = async (commentId) => {
    if (isEffectivelyEmptyHtml(editCommentText)) return;
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

  const headerChips = [
    announcement.status && {
      label: announcement.status,
      color:
        (announcement.status === 'published' && 'success') ||
        (announcement.status === 'draft' && 'warning') ||
        'default',
    },
  ].filter(Boolean);

  const sections = [
    {
      title: 'Announcement Information',
      icon: 'solar:megaphone-bold',
      rows: [
        { label: 'Title', value: announcement.title || '-' },
        {
          label: 'View Count',
          value: announcement.viewCount ?? 0,
        },
        creator && {
          label: 'Created By',
          value: creator.name,
        },
      ].filter(Boolean),
    },
    {
      title: 'Meta',
      icon: 'solar:clock-circle-bold',
      rows: [
        announcement.status && {
          label: 'Status',
          value: (
            <Chip
              label={announcement.status}
              color={
                (announcement.status === 'published' && 'success') ||
                (announcement.status === 'draft' && 'warning') ||
                'default'
              }
              size="small"
              sx={{ mt: 0.5, fontWeight: 600, textTransform: 'capitalize' }}
            />
          ),
        },
        {
          label: 'Created At',
          value: announcement.createdAt
            ? fDateTime(announcement.createdAt, 'DD MMM YYYY h:mm A')
            : '-',
        },
        {
          label: 'Updated At',
          value: announcement.updatedAt
            ? fDateTime(announcement.updatedAt, 'DD MMM YYYY h:mm A')
            : '-',
        },
      ].filter(Boolean),
    },
    {
      title: 'Description',
      icon: 'solar:document-text-bold',
      fullWidth: true,
      rows: [
        {
          label: 'Content',
          value:
            announcement.description || announcement.content ? (
              <ViewHtmlContent
                html={announcement.description || announcement.content}
                sx={{
                  typography: 'body1',
                  fontSize: '1rem',
                  lineHeight: 1.8,
                  color: 'text.primary',
                }}
              />
            ) : (
              '-'
            ),
        },
      ],
    },
  ];

  return (
    <DashboardContent>
      <EntityDetailsLayout
        heading="Announcement Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Announcement', href: paths.admin.announcement.list },
          { name: announcement?.title },
        ]}
        editHref={paths.admin.announcement.edit(announcement?.id)}
        header={{
          backgroundImage: '/assets/profilebg.jpg',
          avatarText: creator?.initials || announcement.title?.slice(0, 2)?.toUpperCase() || '?',
          title: announcement.title || '-',
          subtitle: announcement.createdAt
            ? `Created ${fDateTime(announcement.createdAt, 'DD MMM YYYY h:mm A')}`
            : undefined,
          chips: headerChips,
        }}
        sections={sections}
      />

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
                richText
                onUploadCommentImage={handleCommentMediaUpload}
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
        </DashboardContent>
  );
}
