import { useState, useEffect, useRef, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import CircularProgress from 'src/components/loading/circular-progress';
import { alpha, useTheme } from '@mui/material/styles';

import { DashboardContent } from 'src/layouts/dashboard';

import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { PageSectionHeader } from 'src/components/page-section-header/page-section-header';
import { DETAIL_PAGE_LIST_SHELL_SX, DETAIL_PAGE_WRAPPER_SX } from 'src/components/page-section-header/detail-page-styles';
import { HOME_SECTION_CARD_SX } from 'src/sections/home/home-section-styles';
import { InfinitePagination } from 'src/components/infinite-pagination';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { Editor } from 'src/components/editor';
import { AiForumItem } from '../ai-forum-item';
import { aiForumService } from 'src/services/ai-forum.service';
import { toast } from 'src/components/snackbar';
import { useAuthContext } from 'src/auth/hooks';
import { useAiForumListSocket } from 'src/hooks/use-ai-forum-list-socket';
import { htmlToPlainText, isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import { fDateTimePersonal } from 'src/utils/format-time';

// ----------------------------------------------------------------------

const ITEMS_PER_PAGE = 5;
const SEARCH_DEBOUNCE_MS = 800;

const DEFAULT_PAGINATION = {
  page: 1,
  limit: ITEMS_PER_PAGE,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

// Transform API data to component format
const transformAiForumPost = (post) => {
  const createdAt = post.createdAt ? new Date(post.createdAt) : new Date();
  const lastActivity = fDateTimePersonal(createdAt);

  const description = post.description || '';
  const plainDescription = htmlToPlainText(description);
  const excerpt =
    plainDescription.length > 150
      ? `${plainDescription.substring(0, 150)}...`
      : plainDescription;

  return {
    id: post.id,
    title: post.title || '',
    description,
    content: description,
    excerpt,
    views: post.viewCount || 0,
    replies: post.comments?.length || 0,
    comments: post.comments || [],
    lastActivity,
    createdAt,
    participants: [],
    isPinned: post.isPinned || false,
    userId: post.userId ?? null,
  };
};

export function AiForumView() {
  const theme = useTheme();
  const { user } = useAuthContext();
  const [posts, setAiForumPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [editAiForumPost, setEditAiForumPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [selectedOwnPostIds, setSelectedOwnPostIds] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [deletingOnePostId, setDeletingOnePostId] = useState(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [pendingDeletePost, setPendingDeletePost] = useState(null);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    const normalizedSearch = searchQuery.trim();

    if (normalizedSearch === '') {
      setDebouncedSearchQuery('');
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(normalizedSearch);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const matchesCurrentFilters = useCallback(
    (post) => {
      const normalizedSearch = debouncedSearchQuery.toLowerCase();
      const descPlain = htmlToPlainText(post.description || '');
      const matchesSearch =
        normalizedSearch === '' ||
        post.title?.toLowerCase().includes(normalizedSearch) ||
        descPlain.toLowerCase().includes(normalizedSearch);

      const matchesFilter = filterType === 'all' || post.isPinned;

      return matchesSearch && matchesFilter;
    },
    [debouncedSearchQuery, filterType]
  );

  const fetchAiForumPosts = useCallback(
    async ({ page = 1, append = false } = {}) => {
      const nextRequestId = latestRequestRef.current + 1;
      latestRequestRef.current = nextRequestId;
      const requestId = nextRequestId;

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const response = await aiForumService.getAllPosts({
          page,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearchQuery || undefined,
          isPinned: filterType === 'pinned' ? true : undefined,
        });

        if (requestId !== latestRequestRef.current) return;

        const transformedAiForumPosts = (response.data || []).map(transformAiForumPost);

        setAiForumPosts((prev) => {
          if (!append) {
            return transformedAiForumPosts;
          }

          const existingIds = new Set(prev.map((post) => post.id));
          const newAiForumPosts = transformedAiForumPosts.filter(
            (post) => !existingIds.has(post.id)
          );

          return [...prev, ...newAiForumPosts];
        });

        setPagination({
          page: response.pagination?.page || page,
          limit: response.pagination?.limit || ITEMS_PER_PAGE,
          totalItems: response.pagination?.totalItems || 0,
          totalPages: response.pagination?.totalPages || 0,
          hasNextPage: response.pagination?.hasNextPage || false,
          hasPreviousPage: response.pagination?.hasPreviousPage || false,
        });
      } catch (error) {
        if (requestId !== latestRequestRef.current) return;

        console.error('Error fetching posts:', error);
        toast.error('Failed to load posts');

        if (!append) {
          setAiForumPosts([]);
          setPagination(DEFAULT_PAGINATION);
        }
      } finally {
        if (requestId === latestRequestRef.current) {
          if (append) {
            setLoadingMore(false);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [debouncedSearchQuery, filterType, latestRequestRef]
  );

  const handleCreateOpen = () => {
    setCreateTitle('');
    setCreateDescription('');
    setCreateOpen(true);
  };

  const handleCreateClose = () => {
    if (!submittingCreate) setCreateOpen(false);
  };

  const handleEditorMediaUpload = useCallback(async (file) => {
    try {
      return await aiForumService.uploadPostMedia(file);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Media upload failed');
      return '';
    }
  }, []);

  const handleCreateSubmit = async () => {
    if (!createTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (isEffectivelyEmptyHtml(createDescription)) {
      toast.error('Please enter a description');
      return;
    }
    if (createDescription.length > 50000) {
      toast.error('Description is too long');
      return;
    }
    try {
      setSubmittingCreate(true);
      const result = await aiForumService.createPost({
        title: createTitle.trim(),
        description: createDescription,
      });
      const newAiForumPost = result?.post ?? result;
      if (newAiForumPost) {
        const transformed = transformAiForumPost(newAiForumPost);
        if (matchesCurrentFilters(transformed)) {
          setAiForumPosts((prev) => {
            if (prev.some((q) => q.id === transformed.id)) return prev;
            return [transformed, ...prev];
          });
          setPagination((prev) => ({
            ...prev,
            totalItems: prev.totalItems + 1,
          }));
        }
      } else {
        await fetchAiForumPosts({ page: 1, append: false });
      }
      setCreateOpen(false);
      setCreateTitle('');
      setCreateDescription('');
      toast.success('Post created successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create post');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handlePinToggle = useCallback((postId, isPinned) => {
    setAiForumPosts((prev) =>
      prev
        .map((post) =>
          post.id === postId ? { ...post, isPinned } : post
        )
        .filter((post) => !(filterType === 'pinned' && !post.isPinned))
    );

    if (filterType === 'pinned' && !isPinned) {
      setPagination((prev) => ({
        ...prev,
        totalItems: Math.max(prev.totalItems - 1, 0),
      }));
    }
  }, [filterType]);

  const handleEditClick = (post) => {
    setEditAiForumPost(post);
    setEditTitle(post.title || '');
    setEditDescription(post.description || post.content || '');
  };

  const handleEditClose = () => {
    if (!submittingEdit) {
      setEditAiForumPost(null);
      setEditTitle('');
      setEditDescription('');
    }
  };

  const handleEditSubmit = async () => {
    if (!editAiForumPost?.id || !editTitle.trim()) return;
    if (isEffectivelyEmptyHtml(editDescription)) {
      toast.error('Please enter a description');
      return;
    }
    if (editDescription.length > 50000) {
      toast.error('Description is too long');
      return;
    }
    try {
      setSubmittingEdit(true);
      const updated = await aiForumService.updatePost(editAiForumPost.id, {
        title: editTitle.trim(),
        description: editDescription,
      });
      const post = updated?.post ?? updated;
      if (post) {
        setAiForumPosts((prev) =>
          prev.map((q) => (q.id === editAiForumPost.id ? transformAiForumPost(post) : q))
        );
      }
      handleEditClose();
      toast.success('Post updated successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update post');
    } finally {
      setSubmittingEdit(false);
    }
  };

  useEffect(() => {
    fetchAiForumPosts({ page: 1, append: false });
  }, [fetchAiForumPosts]);

  // Real-time updates when any client creates/updates/deletes a post (no refresh needed)
  useAiForumListSocket(
    {
      onAiForumPostCreated: (post) => {
        const transformedAiForumPost = transformAiForumPost(post);
        if (!matchesCurrentFilters(transformedAiForumPost)) return;

        setAiForumPosts((prev) => {
          if (prev.some((item) => item.id === transformedAiForumPost.id)) return prev;
          return [transformedAiForumPost, ...prev];
        });
        setPagination((prev) => ({
          ...prev,
          totalItems: prev.totalItems + 1,
        }));
      },
      onAiForumPostUpdated: (post) => {
        const transformedAiForumPost = transformAiForumPost(post);

        setAiForumPosts((prev) => {
          const exists = prev.some((item) => item.id === transformedAiForumPost.id);

          if (!matchesCurrentFilters(transformedAiForumPost)) {
            return prev.filter((item) => item.id !== transformedAiForumPost.id);
          }

          if (!exists) {
            return [transformedAiForumPost, ...prev];
          }

          return prev.map((item) =>
            item.id === transformedAiForumPost.id ? transformedAiForumPost : item
          );
        });
      },
      onAiForumPostDeleted: (payload) => {
        const id = payload?.postId;
        if (!id) return;

        setAiForumPosts((prev) => prev.filter((post) => post.id !== id));
        setPagination((prev) => ({
          ...prev,
          totalItems: Math.max(prev.totalItems - 1, 0),
        }));
      },
    },
    { enabled: true }
  );

  const sortedAiForumPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const displayedAiForumPosts = sortedAiForumPosts;
  const hasMore = pagination.hasNextPage;

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchAiForumPosts({ page: pagination.page + 1, append: true });
  }, [fetchAiForumPosts, hasMore, loading, loadingMore, pagination.page]);

  const showInitialLoader = loading && posts.length === 0;
  const showRefreshingState = loading && posts.length > 0;
  const ownVisiblePostIds = displayedAiForumPosts
    .filter((post) => user && post.userId === user.id)
    .map((post) => post.id);
  const selectedCount = selectedOwnPostIds.length;

  const toggleOwnPostSelection = useCallback((postId) => {
    setSelectedOwnPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  }, []);

  const handleSelectAllOwnVisible = useCallback(() => {
    setSelectedOwnPostIds((prev) => {
      const allSelected =
        ownVisiblePostIds.length > 0 &&
        ownVisiblePostIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !ownVisiblePostIds.includes(id));
      }
      const merged = new Set([...prev, ...ownVisiblePostIds]);
      return [...merged];
    });
  }, [ownVisiblePostIds]);

  const handleBulkDeleteOwnPosts = useCallback(async () => {
    if (selectedOwnPostIds.length === 0) return;
    try {
      setDeletingSelected(true);
      const res = await aiForumService.bulkDeleteOwnPosts(selectedOwnPostIds);
      const deletedIds = Array.isArray(res?.deletedIds) ? res.deletedIds : [];
      if (deletedIds.length > 0) {
        setAiForumPosts((prev) => prev.filter((post) => !deletedIds.includes(post.id)));
        setSelectedOwnPostIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
        setPagination((prev) => ({
          ...prev,
          totalItems: Math.max(prev.totalItems - deletedIds.length, 0),
        }));
      }
      toast.success(
        res?.message || `Deleted ${deletedIds.length} post${deletedIds.length !== 1 ? 's' : ''}`
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete selected posts');
    } finally {
      setDeletingSelected(false);
    }
  }, [selectedOwnPostIds]);

  const handleDeleteOwnPost = useCallback(async () => {
    if (!pendingDeletePost?.id) return;
    try {
      setDeletingOnePostId(pendingDeletePost.id);
      await aiForumService.deleteOwnPost(pendingDeletePost.id);
      setAiForumPosts((prev) => prev.filter((item) => item.id !== pendingDeletePost.id));
      setSelectedOwnPostIds((prev) => prev.filter((id) => id !== pendingDeletePost.id));
      setPagination((prev) => ({
        ...prev,
        totalItems: Math.max(prev.totalItems - 1, 0),
      }));
      toast.success('Post deleted successfully');
      setPendingDeletePost(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete post');
    } finally {
      setDeletingOnePostId(null);
    }
  }, [pendingDeletePost]);

  if (showInitialLoader) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Box sx={DETAIL_PAGE_WRAPPER_SX}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          justifyContent="space-between"
          sx={{ mb: { xs: 2, md: 3 } }}
        >
          <PageSectionHeader
            title="AI Forum"
            description="Ask posts, get help, and share knowledge with the AI community"
            sx={{ mb: 0, flex: 1, minWidth: 0 }}
          />
          {user ? (
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" width={22} />}
              onClick={handleCreateOpen}
              sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
            >
              Create post
            </Button>
          ) : null}
        </Stack>

        {/* Create post drawer */}
        <Drawer anchor="right" open={createOpen} onClose={handleCreateClose}>
          <Stack sx={{ width: { xs: '100vw', sm: 560 }, height: '100%' }}>
            <Box
              sx={{
                px: 3,
                py: 2.25,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:add-circle-bold" width={22} sx={{ color: 'primary.main' }} />
                <Typography variant="h6">Create post</Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Use the toolbar for formatting, links, and images (same editor as admin posts).
              </Typography>
            </Box>
            <Divider />
            <Stack spacing={2} sx={{ px: 3, py: 2, flex: 1, overflow: 'auto', minHeight: 0 }}>
              <Typography variant="subtitle2">Post title</Typography>
              <TextField
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="What do you want to ask?"
                fullWidth
                required
                autoFocus
                inputProps={{ maxLength: 120 }}
                helperText={`${createTitle.length}/120`}
              />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Post details
                </Typography>
                <Editor
                  value={createDescription}
                  onChange={setCreateDescription}
                  onUploadImage={handleEditorMediaUpload}
                  fullItem={false}
                  placeholder="Add more details, images, or links…"
                  sx={{ maxHeight: 380 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  {createDescription.length}/50000 characters (HTML)
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
              <Button onClick={handleCreateClose} disabled={submittingCreate}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateSubmit}
                disabled={
                  submittingCreate ||
                  !createTitle.trim() ||
                  isEffectivelyEmptyHtml(createDescription) ||
                  createDescription.length > 50000
                }
                startIcon={submittingCreate ? <CircularProgress size={18} /> : null}
              >
                {submittingCreate ? 'Creating...' : 'Create'}
              </Button>
            </Stack>
          </Stack>
        </Drawer>

        {/* Edit post drawer */}
        <Drawer anchor="right" open={Boolean(editAiForumPost)} onClose={handleEditClose}>
          <Stack sx={{ width: { xs: '100vw', sm: 560 }, height: '100%' }}>
            <Box
              sx={{
                px: 3,
                py: 2.25,
                bgcolor: alpha(theme.palette.warning.main, 0.08),
                borderBottom: `1px solid ${alpha(theme.palette.warning.main, 0.18)}`,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:pen-bold" width={20} sx={{ color: 'warning.main' }} />
                <Typography variant="h6">Edit post</Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Use the toolbar for formatting, links, and images.
              </Typography>
            </Box>
            <Divider />
            <Stack spacing={2} sx={{ px: 3, py: 2, flex: 1, overflow: 'auto', minHeight: 0 }}>
              <Typography variant="subtitle2">Post title</Typography>
              <TextField
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="What do you want to ask?"
                fullWidth
                required
                autoFocus
                inputProps={{ maxLength: 120 }}
                helperText={`${editTitle.length}/120`}
              />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Post details
                </Typography>
                <Editor
                  value={editDescription}
                  onChange={setEditDescription}
                  onUploadImage={handleEditorMediaUpload}
                  fullItem={false}
                  placeholder="Add more details, images, or links…"
                  sx={{ maxHeight: 380 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  {editDescription.length}/50000 characters (HTML)
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
              <Button onClick={handleEditClose} disabled={submittingEdit}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleEditSubmit}
                disabled={
                  submittingEdit ||
                  !editTitle.trim() ||
                  isEffectivelyEmptyHtml(editDescription) ||
                  editDescription.length > 50000
                }
                startIcon={submittingEdit ? <CircularProgress size={18} /> : null}
              >
                {submittingEdit ? 'Updating...' : 'Update'}
              </Button>
            </Stack>
          </Stack>
        </Drawer>

        {/* Search and Filter */}
        <Card sx={{ ...HOME_SECTION_CARD_SX, mb: 3, p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {/* Search Box */}
            <Box
              sx={{
                flex: 1,
                position: 'relative',
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                bgcolor: 'background.paper',
                '&:hover': {
                  borderColor: alpha(theme.palette.grey[500], 0.4),
                },
                '&:focus-within': {
                  borderColor: 'primary.main',
                  boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'text.secondary',
                }}
              >
                <Iconify icon="solar:magnifer-linear" width={20} />
              </Box>
              <InputBase
                placeholder="Search posts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  width: '100%',
                  pl: 5,
                  pr: searchQuery ? 6 : 2,
                  py: 1.25,
                  fontSize: '0.875rem',
                }}
              />
              {searchQuery && (
                <IconButton
                  onClick={() => setSearchQuery('')}
                  size="small"
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'text.secondary',
                  }}
                >
                  <Iconify icon="solar:close-circle-bold" width={18} />
                </IconButton>
              )}
            </Box>

            {/* Filter + bulk select (own posts) */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {[
                { value: 'all', label: 'All', icon: 'solar:list-bold-duotone' },
                { value: 'pinned', label: 'Pinned', icon: 'solar:pin-bold' },
              ].map((filter) => (
                <Button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value)}
                  startIcon={<Iconify icon={filter.icon} width={18} />}
                  variant={filterType === filter.value ? 'contained' : 'outlined'}
                  color="primary"
                  sx={{
                    minWidth: 'auto',
                    px: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  {filter.label}
                </Button>
              ))}
              {user && ownVisiblePostIds.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={handleSelectAllOwnVisible}
                  sx={{
                    ml: { xs: 0, sm: 0.5 },
                    textTransform: 'none',
                    fontWeight: 500,
                    borderStyle: 'dashed',
                  }}
                >
                  {ownVisiblePostIds.every((id) => selectedOwnPostIds.includes(id))
                    ? 'Unselect all'
                    : 'Select all'}
                </Button>
              )}
            </Stack>
          </Stack>
        </Card>

        {selectedCount > 0 && (
          <Card
            sx={{
              position: 'fixed',
              left: { xs: 8, sm: 16 },
              right: { xs: 8, sm: 16 },
              bottom: { xs: 10, sm: 16 },
              zIndex: 1200,
              p: { xs: 1.25, sm: 1.5 },
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              backdropFilter: 'blur(8px)',
              boxShadow: theme.customShadows.z8,
              overflowX: 'hidden',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              sx={{ minWidth: 0 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedCount} selected
              </Typography>
              <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setSelectedOwnPostIds([])}
                  disabled={deletingSelected}
                  sx={{ flex: { xs: 1, sm: 'none' } }}
                >
                  Clear
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={18} />}
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                  disabled={deletingSelected || deletingOnePostId !== null}
                  sx={{ flex: { xs: 1, sm: 'none' } }}
                >
                  {deletingSelected ? 'Deleting...' : 'Delete'}
                </Button>
              </Stack>
            </Stack>
          </Card>
        )}

        {/* Posts — flat rows, dividers between items */}
        <Box sx={DETAIL_PAGE_LIST_SHELL_SX}>
          {showRefreshingState && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {sortedAiForumPosts.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
                px: 2,
                color: 'text.secondary',
              }}
            >
              <Iconify
                icon="solar:chat-round-bold-duotone"
                width={64}
                sx={{ mb: 2, opacity: 0.5 }}
              />
              <Typography variant="h6">No posts found</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Try adjusting your search or filter
              </Typography>
            </Box>
          ) : (
            <>
              {displayedAiForumPosts.map((post, index) => (
                <Box key={post.id} sx={{ display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <AiForumItem
                      post={post}
                      onPinToggle={handlePinToggle}
                      onEdit={handleEditClick}
                      onDelete={deletingOnePostId === post.id ? null : setPendingDeletePost}
                      selectable={Boolean(user && post.userId === user.id)}
                      selected={selectedOwnPostIds.includes(post.id)}
                      onToggleSelect={() => toggleOwnPostSelection(post.id)}
                      showBottomDivider={index < displayedAiForumPosts.length - 1}
                    />
                  </Box>
                </Box>
              ))}
            </>
          )}
        </Box>

        <InfinitePagination
          hasMore={hasMore}
          loading={loadingMore}
          onLoadMore={loadMore}
          loadedCount={displayedAiForumPosts.length}
          totalCount={pagination.totalItems}
          itemLabel="posts"
          disabled={loading}
        />
        {selectedCount > 0 && <Box sx={{ height: { xs: 78, sm: 86 } }} />}

        <ConfirmDialog
          open={bulkDeleteConfirmOpen}
          onClose={() => {
            if (!deletingSelected) setBulkDeleteConfirmOpen(false);
          }}
          title="Delete selected posts"
          content={`Delete ${selectedCount} selected post${selectedCount !== 1 ? 's' : ''}? This cannot be undone.`}
          action={
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                await handleBulkDeleteOwnPosts();
                setBulkDeleteConfirmOpen(false);
              }}
              disabled={deletingSelected || selectedCount === 0}
            >
              Delete
            </Button>
          }
        />

        <ConfirmDialog
          open={Boolean(pendingDeletePost)}
          onClose={() => {
            if (!deletingOnePostId) setPendingDeletePost(null);
          }}
          title="Delete post"
          content="Are you sure you want to delete this post? This cannot be undone."
          action={
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteOwnPost}
              disabled={Boolean(deletingOnePostId)}
            >
              Delete
            </Button>
          }
        />
      </Box>
    </DashboardContent>
  );
}




