import { useState, useEffect, useRef, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
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
import { AnnouncementItem } from '../announcement-item';
import { announcementService } from 'src/services/announcement.service';
import { notificationService } from 'src/services/notification.service';
import { toast } from 'src/components/snackbar';
import { useAuthContext } from 'src/auth/hooks';
import { useAnnouncementsListSocket } from 'src/hooks/use-announcements-list-socket';
import {
  refreshAnnouncementUnreadCount,
  useAnnouncementUnreadCount,
} from 'src/hooks/use-announcement-unread-count';
import { htmlToPlainText } from 'src/utils/html-plain-text';
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

const transformAnnouncement = (announcement) => {
  const createdAt = announcement.createdAt ? new Date(announcement.createdAt) : new Date();
  const lastActivity = fDateTimePersonal(createdAt);

  const description = announcement.description || '';
  const plainDescription = htmlToPlainText(description);
  const excerpt =
    plainDescription.length > 150 ? `${plainDescription.substring(0, 150)}...` : plainDescription;

  return {
    id: announcement.id,
    title: announcement.title || '',
    description,
    content: description,
    createdBy: announcement.createdBy || null,
    excerpt,
    views: announcement.viewCount || 0,
    lastActivity,
    createdAt,
    isPinned: announcement.isPinned || false,
    isHighlight: false,
  };
};

export function AnnouncementsView() {
  const theme = useTheme();
  const { authenticated } = useAuthContext();
  const { count: unreadCount, refresh: refreshUnreadCount } = useAnnouncementUnreadCount({
    enabled: authenticated,
  });
  const [announcements, setAnnouncements] = useState([]);
  /** announcementId -> notificationId for unread items */
  const [unreadMap, setUnreadMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const latestRequestRef = useRef(0);

  const loadUnreadMap = useCallback(async () => {
    if (!authenticated) {
      setUnreadMap({});
      return;
    }
    try {
      const response = await notificationService.getNotifications({
        page: 1,
        limit: 50,
        unreadOnly: true,
      });
      const nextMap = {};
      (response.data || []).forEach((item) => {
        if (item.referenceId) {
          nextMap[item.referenceId] = item.id;
        }
      });
      setUnreadMap(nextMap);
    } catch (error) {
      console.error('Failed to load unread announcement notifications:', error);
    }
  }, [authenticated]);

  useEffect(() => {
    loadUnreadMap();
  }, [loadUnreadMap, unreadCount]);

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
    (announcement) => {
      const normalizedSearch = debouncedSearchQuery.toLowerCase();
      const descPlain = htmlToPlainText(announcement.description || '');
      const matchesSearch =
        normalizedSearch === '' ||
        announcement.title?.toLowerCase().includes(normalizedSearch) ||
        descPlain.toLowerCase().includes(normalizedSearch);

      const matchesFilter = filterType === 'all' || announcement.isPinned;

      return matchesSearch && matchesFilter;
    },
    [debouncedSearchQuery, filterType]
  );

  const fetchAnnouncements = useCallback(
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

        const response = await announcementService.getAllAnnouncements({
          page,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearchQuery || undefined,
          isPinned: filterType === 'pinned' ? true : undefined,
        });

        if (requestId !== latestRequestRef.current) return;

        const transformedAnnouncements = (response.data || []).map(transformAnnouncement);

        setAnnouncements((prev) => {
          if (!append) {
            return transformedAnnouncements;
          }

          const existingIds = new Set(prev.map((announcement) => announcement.id));
          const newAnnouncements = transformedAnnouncements.filter(
            (announcement) => !existingIds.has(announcement.id)
          );

          return [...prev, ...newAnnouncements];
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

        console.error('Error fetching announcements:', error);
        toast.error('Failed to load announcements');

        if (!append) {
          setAnnouncements([]);
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
    [debouncedSearchQuery, filterType]
  );

  useEffect(() => {
    fetchAnnouncements({ page: 1, append: false });
  }, [fetchAnnouncements]);

  const handlePinToggle = useCallback(
    (announcementId, isPinned) => {
      setAnnouncements((prev) =>
        prev
          .map((announcement) =>
            announcement.id === announcementId ? { ...announcement, isPinned } : announcement
          )
          .filter((announcement) => !(filterType === 'pinned' && !announcement.isPinned))
      );

      if (filterType === 'pinned' && !isPinned) {
        setPagination((prev) => ({
          ...prev,
          totalItems: Math.max(prev.totalItems - 1, 0),
        }));
      }
    },
    [filterType]
  );

  const handleViewCountUpdate = useCallback((announcementId, views) => {
    setAnnouncements((prev) =>
      prev.map((announcement) =>
        announcement.id === announcementId ? { ...announcement, views } : announcement
      )
    );
  }, []);

  const handleMarkAsRead = useCallback(async () => {
    if (!authenticated || markingRead || unreadCount < 1) return;
    try {
      setMarkingRead(true);
      await notificationService.markAllAsRead();
      setUnreadMap({});
      await refreshUnreadCount();
      refreshAnnouncementUnreadCount();
      toast.success('All announcements marked as read');
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    } finally {
      setMarkingRead(false);
    }
  }, [authenticated, markingRead, refreshUnreadCount, unreadCount]);

  const handleMarkOneRead = useCallback(
    async (announcementId) => {
      const notificationId = unreadMap[announcementId];
      if (!notificationId) return;

      setUnreadMap((prev) => {
        const next = { ...prev };
        delete next[announcementId];
        return next;
      });

      try {
        let idToMark = notificationId;
        if (idToMark === true) {
          const response = await notificationService.getNotifications({
            page: 1,
            limit: 50,
            unreadOnly: true,
          });
          idToMark = (response.data || []).find((item) => item.referenceId === announcementId)?.id;
        }
        if (idToMark && idToMark !== true) {
          await notificationService.markAsRead(idToMark);
        }
        await refreshUnreadCount();
        refreshAnnouncementUnreadCount();
      } catch (error) {
        console.error('Failed to mark announcement as read:', error);
        setUnreadMap((prev) => ({ ...prev, [announcementId]: notificationId }));
      }
    },
    [refreshUnreadCount, unreadMap]
  );

  // New announcements arriving live are unread until marked.
  const handleAnnouncementCreated = useCallback(
    (announcement) => {
      const transformedAnnouncement = transformAnnouncement(announcement);
      if (!matchesCurrentFilters(transformedAnnouncement)) return;

      setAnnouncements((prev) => {
        if (prev.some((item) => item.id === transformedAnnouncement.id)) return prev;
        return [transformedAnnouncement, ...prev];
      });

      setPagination((prev) => ({
        ...prev,
        totalItems: prev.totalItems + 1,
      }));

      if (authenticated && transformedAnnouncement.id) {
        // Optimistic unread highlight until notification rows are loaded.
        setUnreadMap((prev) =>
          prev[transformedAnnouncement.id]
            ? prev
            : { ...prev, [transformedAnnouncement.id]: true }
        );
        refreshUnreadCount();
        // Resolve real notification ids shortly after backend fan-out.
        setTimeout(() => {
          loadUnreadMap();
        }, 400);
      }
    },
    [authenticated, loadUnreadMap, matchesCurrentFilters, refreshUnreadCount]
  );

  useAnnouncementsListSocket(
    {
      onAnnouncementCreated: handleAnnouncementCreated,
      onAnnouncementUpdated: (announcement) => {
        const transformedAnnouncement = transformAnnouncement(announcement);

        setAnnouncements((prev) => {
          const exists = prev.some((item) => item.id === transformedAnnouncement.id);

          if (!matchesCurrentFilters(transformedAnnouncement)) {
            return prev.filter((item) => item.id !== transformedAnnouncement.id);
          }

          if (!exists) {
            return [transformedAnnouncement, ...prev];
          }

          return prev.map((item) =>
            item.id === transformedAnnouncement.id ? transformedAnnouncement : item
          );
        });
      },
      onAnnouncementDeleted: (payload) => {
        const id = payload?.announcementId;
        if (!id) return;

        setAnnouncements((prev) => prev.filter((item) => item.id !== id));
        setPagination((prev) => ({
          ...prev,
          totalItems: Math.max(prev.totalItems - 1, 0),
        }));
      },
    },
    { enabled: true }
  );

  const displayedAnnouncements = announcements;
  const hasMore = pagination.hasNextPage;
  const showInitialLoader = loading && announcements.length === 0;
  const showRefreshingState = loading && announcements.length > 0;

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchAnnouncements({ page: pagination.page + 1, append: true });
  }, [fetchAnnouncements, hasMore, loading, loadingMore, pagination.page]);

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
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <PageSectionHeader
            title="Announcements"
            description="Stay updated with the latest news, features, and community updates"
            sx={{ mb: 0 }}
          />
          {authenticated && unreadCount > 0 ? (
            <Button
              variant="contained"
              color="info"
              size="small"
              startIcon={<Iconify icon="eva:done-all-fill" />}
              onClick={handleMarkAsRead}
              disabled={markingRead}
              sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 600 }}
            >
              {markingRead ? 'Marking…' : `Mark all as read (${unreadCount})`}
            </Button>
          ) : null}
        </Stack>

        <Card sx={{ ...HOME_SECTION_CARD_SX, mb: 2, p: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
                placeholder="Search announcements…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  width: '100%',
                  pl: 5,
                  pr: searchQuery ? 6 : 2,
                  py: 1,
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

            <Stack direction="row" spacing={1}>
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
                  size="small"
                  sx={{
                    minWidth: 'auto',
                    px: 1.75,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  {filter.label}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Card>

        <Box sx={{ ...DETAIL_PAGE_LIST_SHELL_SX, py: 0 }}>
          {showRefreshingState && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {displayedAnnouncements.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 2,
                color: 'text.secondary',
              }}
            >
              <Iconify
                icon="solar:file-text-bold-duotone"
                width={48}
                sx={{ mb: 1.5, opacity: 0.5 }}
              />
              <Typography variant="subtitle1">No announcements found</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Try adjusting your search or filter
              </Typography>
            </Box>
          ) : (
            displayedAnnouncements.map((announcement, index) => (
              <AnnouncementItem
                key={announcement.id}
                announcement={announcement}
                isUnread={Boolean(unreadMap[announcement.id])}
                onPinToggle={handlePinToggle}
                onViewCountUpdate={handleViewCountUpdate}
                onMarkRead={handleMarkOneRead}
                showBottomDivider={index < displayedAnnouncements.length - 1}
              />
            ))
          )}
        </Box>

        <InfinitePagination
          hasMore={hasMore}
          loading={loadingMore}
          onLoadMore={loadMore}
          loadedCount={displayedAnnouncements.length}
          totalCount={pagination.totalItems}
          itemLabel="announcements"
          disabled={loading}
        />
      </Box>
    </DashboardContent>
  );
}
