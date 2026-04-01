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
import { InfinitePagination } from 'src/components/infinite-pagination';
import { AiForumItem } from '../ai-forum-item';
import { aiForumService } from 'src/services/ai-forum.service';
import { toast } from 'src/components/snackbar';
import { useAuthContext } from 'src/auth/hooks';
import { useAiForumListSocket } from 'src/hooks/use-ai-forum-list-socket';
import { htmlToPlainText } from 'src/utils/html-plain-text';
import { fDateTimePersonal } from 'src/utils/format-time';

// ----------------------------------------------------------------------

const ITEMS_PER_PAGE = 10;
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

  const handleCreateSubmit = async () => {
    if (!createTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!createDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }
    try {
      setSubmittingCreate(true);
      const result = await aiForumService.createPost({
        title: createTitle.trim(),
        description: createDescription.trim(),
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
    if (!editAiForumPost?.id || !editTitle.trim() || !editDescription.trim()) return;
    try {
      setSubmittingEdit(true);
      const updated = await aiForumService.updatePost(editAiForumPost.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
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

  if (showInitialLoader) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Box sx={{ maxWidth: 'fullWidth' }}>
        {/* Header Section */}
        <Box sx={{ mb: 5 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Iconify
                icon="solar:chat-round-bold-duotone"
                width={40}
                sx={{ color: 'primary.main' }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  fontWeight: 700,
                  color: 'text.primary',
                }}
              >
                AI Forum
              </Typography>
            </Stack>
            {user && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:add-circle-bold" width={22} />}
                onClick={handleCreateOpen}
                sx={{ flexShrink: 0 }}
              >
                Create post
              </Button>
            )}
          </Stack>
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '0.9375rem', md: '1rem' },
              color: 'text.secondary',
            }}
          >
            Ask posts, get help, and share knowledge with the AI community
          </Typography>
        </Box>

        {/* Create post drawer */}
        <Drawer anchor="right" open={createOpen} onClose={handleCreateClose}>
          <Stack sx={{ width: { xs: '100vw', sm: 480 }, height: '100%' }}>
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
                Share a clear title and enough detail so others can help quickly.
              </Typography>
            </Box>
            <Divider />
            <Stack spacing={2} sx={{ px: 3, py: 2, flex: 1 }}>
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
              <Typography variant="subtitle2">Post details</Typography>
              <TextField
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Add more details..."
                fullWidth
                required
                multiline
                minRows={6}
                inputProps={{ maxLength: 2000 }}
                helperText={`${createDescription.length}/2000`}
              />
            </Stack>
            <Divider />
            <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
              <Button onClick={handleCreateClose} disabled={submittingCreate}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateSubmit}
                disabled={submittingCreate || !createTitle.trim() || !createDescription.trim()}
                startIcon={submittingCreate ? <CircularProgress size={18} /> : null}
              >
                {submittingCreate ? 'Creating...' : 'Create'}
              </Button>
            </Stack>
          </Stack>
        </Drawer>

        {/* Edit post drawer */}
        <Drawer anchor="right" open={Boolean(editAiForumPost)} onClose={handleEditClose}>
          <Stack sx={{ width: { xs: '100vw', sm: 480 }, height: '100%' }}>
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
                Update your title or description and save changes.
              </Typography>
            </Box>
            <Divider />
            <Stack spacing={2} sx={{ px: 3, py: 2, flex: 1 }}>
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
              <Typography variant="subtitle2">Post details</Typography>
              <TextField
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add more details..."
                fullWidth
                required
                multiline
                minRows={6}
                inputProps={{ maxLength: 2000 }}
                helperText={`${editDescription.length}/2000`}
              />
            </Stack>
            <Divider />
            <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
              <Button onClick={handleEditClose} disabled={submittingEdit}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleEditSubmit}
                disabled={submittingEdit || !editTitle.trim() || !editDescription.trim()}
                startIcon={submittingEdit ? <CircularProgress size={18} /> : null}
              >
                {submittingEdit ? 'Updating...' : 'Update'}
              </Button>
            </Stack>
          </Stack>
        </Drawer>

        {/* Search and Filter */}
        <Card sx={{ mb: 3, p: 2 }}>
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

            {/* Filter Buttons */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
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
            </Stack>
          </Stack>
        </Card>

        {/* Posts list */}
        <Card>
          {/* Header Row */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 2,
              py: 2,
              px: 3,
              bgcolor: alpha(theme.palette.grey[500], 0.04),
              borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
            }}
          >
            <Typography variant="subtitle2" sx={{ flex: 1, color: 'text.secondary' }}>
              Topic
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{ minWidth: 70, textAlign: 'center', color: 'text.secondary' }}
            >
              Replies
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{ minWidth: 80, textAlign: 'center', color: 'text.secondary' }}
            >
              Views
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{ minWidth: 70, textAlign: 'center', color: 'text.secondary' }}
            >
              Activity
            </Typography>
          </Box>

          {showRefreshingState && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {/* Post rows */}
          {sortedAiForumPosts.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
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
              {displayedAiForumPosts.map((post) => (
                <AiForumItem
                key={post.id}
                post={post}
                onPinToggle={handlePinToggle}
                onEdit={handleEditClick}
              />
              ))}
            </>
          )}
        </Card>

        <InfinitePagination
          hasMore={hasMore}
          loading={loadingMore}
          onLoadMore={loadMore}
          loadedCount={displayedAiForumPosts.length}
          totalCount={pagination.totalItems}
          itemLabel="posts"
          disabled={loading}
        />
      </Box>
    </DashboardContent>
  );
}




