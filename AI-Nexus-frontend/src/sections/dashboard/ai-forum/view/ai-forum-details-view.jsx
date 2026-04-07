import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';
import { QuickLinksCommentList } from '../../../../components/comment-section';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { fDateTime, fDateTimePersonal } from 'src/utils/format-time';
import { aiForumService, buildAiForumCommentTree } from 'src/services/ai-forum.service';
import { toast } from 'src/components/snackbar';
import { ViewHtmlContent } from 'src/components/html-content';
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

  const title = post.title || '-';
  const initials =
    title
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const headerChips = [
    post.isPinned && { label: 'Pinned', color: 'warning', variant: 'soft' },
  ].filter(Boolean);

  const sections = [
    {
      title: 'Post information',
      icon: 'solar:document-text-bold',
      rows: [
        { label: 'Title', value: post.title || '-' },
        { label: 'View Count', value: post.viewCount ?? 0 },
        {
          label: 'Pinned',
          value: post.isPinned ? (
            <Chip label="Yes" color="warning" size="small" sx={{ mt: 0.5, fontWeight: 600 }} />
          ) : (
            'No'
          ),
        },
      ],
    },
    {
      title: 'Meta',
      icon: 'solar:clock-circle-bold',
      rows: [
        {
          label: 'Created At',
          value: post.createdAt ? fDateTime(post.createdAt, 'DD MMM YYYY h:mm A') : '-',
        },
        {
          label: 'Updated At',
          value: post.updatedAt ? fDateTime(post.updatedAt, 'DD MMM YYYY h:mm A') : '-',
        },
      ],
    },
    {
      title: 'Description',
      icon: 'solar:notes-bold',
      fullWidth: true,
      rows: [
        {
          label: 'Content',
          value: post.description ? (
            <ViewHtmlContent
              html={post.description}
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
        heading="Post details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Forum', href: paths.admin.aiForum.list },
          { name: post?.title },
        ]}
        editHref={paths.admin.aiForum.edit(post?.id)}
        header={{
          backgroundImage: '/assets/profilebg.jpg',
          avatarText: initials,
          title,
          subtitle: post.createdAt
            ? `Created ${fDateTime(post.createdAt, 'DD MMM YYYY h:mm A')}`
            : undefined,
          chips: headerChips,
        }}
        sections={sections}
      />

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
    </DashboardContent>
  );
}


