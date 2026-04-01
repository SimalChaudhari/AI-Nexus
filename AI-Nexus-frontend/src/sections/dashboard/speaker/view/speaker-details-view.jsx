import { useEffect, useState, useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';

import { fDate } from 'src/utils/format-time';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { toast } from 'src/components/snackbar';
import { RichTextContent } from 'src/components/html-content';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

import { speakerService } from 'src/services/speaker.service';
import { getSpeakerReviews, deleteReview } from 'src/services/review.service';

// ----------------------------------------------------------------------

const REVIEWS_PER_PAGE = 8;

// ----------------------------------------------------------------------

export function SpeakerDetailsView({ id }) {
  const theme = useTheme();
  const [speaker, setSpeaker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [speakerReviews, setSpeakerReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const ratingDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    speakerReviews.forEach((r) => {
      const star = Math.round(Number(r.rating));
      if (star >= 1 && star <= 5) counts[star] += 1;
    });
    return [5, 4, 3, 2, 1].map((star) => ({
      name: `${star} Star`,
      reviewCount: counts[star],
    }));
  }, [speakerReviews]);

  const ratingDistributionTotal = useMemo(
    () => ratingDistribution.reduce((acc, r) => acc + r.reviewCount, 0),
    [ratingDistribution]
  );

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const data = await speakerService.getById(id);
        if (mounted) setSpeaker(data);
      } catch (err) {
        if (mounted) setSpeaker(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (!id) {
      setSpeakerReviews([]);
      return undefined;
    }
    let cancelled = false;
    setReviewsLoading(true);
    getSpeakerReviews(id)
      .then((reviews) => {
        if (!cancelled) setSpeakerReviews(Array.isArray(reviews) ? reviews : []);
      })
      .catch(() => {
        if (!cancelled) setSpeakerReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(speakerReviews.length / REVIEWS_PER_PAGE));
    if (reviewsPage > maxPage) setReviewsPage(1);
  }, [speakerReviews.length, reviewsPage]);

  const openDeleteConfirm = (review) => {
    setReviewToDelete(review);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setReviewToDelete(null);
  };

  const handleConfirmDeleteReview = async () => {
    if (!reviewToDelete?.id || !id) return;
    setDeleteLoading(true);
    try {
      await deleteReview(reviewToDelete.id);
      const reviews = await getSpeakerReviews(id);
      setSpeakerReviews(Array.isArray(reviews) ? reviews : []);
      closeDeleteConfirm();
      toast.success('Review deleted');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete review');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!speaker) {
    return (
      <DashboardContent>
        <Typography color="error">Speaker not found.</Typography>
        <Button component={RouterLink} href={paths.admin.speaker.list} sx={{ mt: 2 }}>
          Back to list
        </Button>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={speaker.name}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Speaker', href: paths.admin.speaker.list },
          { name: speaker.name },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.speaker.edit(id)}
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
          >
            Edit
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* Profile header: circular avatar + name */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <Avatar
          src={speaker.profileimage}
          alt={speaker.name}
          sx={{ width: 96, height: 96, border: (t) => `3px solid ${t.palette.background.neutral}` }}
        />
        <Typography
          component={RouterLink}
          href={paths.admin.speaker.edit(id)}
          variant="h4"
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {speaker.name}
        </Typography>
      </Stack>

      {/* About */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          About
        </Typography>
        {speaker.about ? (
          <RichTextContent
            html={speaker.about}
            sx={{ typography: 'body1', color: 'text.primary', lineHeight: 1.7 }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No description provided.
          </Typography>
        )}
      </Box>

      {/* Reviews */}
      <Card sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Reviews {speakerReviews.length > 0 ? `(${speakerReviews.length})` : ''}
        </Typography>
        {reviewsLoading ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Loading reviews...
          </Typography>
        ) : (
          <>
            <Box
              display="grid"
              gridTemplateColumns={{ xs: '1fr', md: 'auto 1fr' }}
              gap={{ xs: 2, md: 3 }}
              alignItems="center"
              sx={{ py: 2 }}
            >
              <Stack spacing={1} alignItems="center" justifyContent="center">
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Average rating
                </Typography>
                <Typography variant="h2" sx={{ lineHeight: 1 }}>
                  {speakerReviews.length > 0
                    ? `${(speakerReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / speakerReviews.length).toFixed(1)}/5`
                    : '0/5'}
                </Typography>
                <Rating
                  readOnly
                  value={
                    speakerReviews.length > 0
                      ? speakerReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / speakerReviews.length
                      : 0
                  }
                  precision={0.1}
                  size="medium"
                  sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' } }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  ({speakerReviews.length} review{speakerReviews.length !== 1 ? 's' : ''})
                </Typography>
              </Stack>
              <Stack spacing={1.5} sx={{ px: { md: 3 }, borderLeft: { md: `dashed 1px ${theme.palette.divider}` } }}>
                {ratingDistribution.map((r) => (
                  <Stack key={r.name} direction="row" alignItems="center" spacing={2}>
                    <Typography variant="subtitle2" component="span" sx={{ width: 56 }}>
                      {r.name}
                    </Typography>
                    <LinearProgress
                      color="inherit"
                      variant="determinate"
                      value={ratingDistributionTotal > 0 ? (r.reviewCount / ratingDistributionTotal) * 100 : 0}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 1, bgcolor: 'grey.200' }}
                    />
                    <Typography variant="body2" component="span" sx={{ minWidth: 32, color: 'text.secondary' }}>
                      {r.reviewCount}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <Divider sx={{ borderStyle: 'dashed', my: 2 }} />
            {speakerReviews.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', py: 3 }}>
                No reviews yet.
              </Typography>
            ) : (
              <Stack spacing={3} sx={{ pt: 1 }}>
                {(() => {
                  const pageCount = Math.max(1, Math.ceil(speakerReviews.length / REVIEWS_PER_PAGE));
                  const displayedReviews = speakerReviews.slice(
                    (reviewsPage - 1) * REVIEWS_PER_PAGE,
                    reviewsPage * REVIEWS_PER_PAGE
                  );
                  return (
                    <>
                      {displayedReviews.map((review) => {
                        const revUser = review.user || {};
                        const name =
                          [revUser.firstname, revUser.lastname].filter(Boolean).join(' ') || revUser.username || 'User';
                        const initials = name.slice(0, 2).toUpperCase();
                        return (
                          <Stack
                            key={review.id}
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={2}
                            sx={{ py: 2 }}
                          >
                            <Stack
                              direction={{ xs: 'row', md: 'column' }}
                              spacing={2}
                              alignItems="center"
                              sx={{ width: { md: 200 }, flexShrink: 0 }}
                            >
                              <Avatar
                                sx={{
                                  width: { xs: 48, md: 56 },
                                  height: { xs: 48, md: 56 },
                                  bgcolor: 'primary.main',
                                  color: 'primary.contrastText',
                                }}
                              >
                                {initials}
                              </Avatar>
                              <Stack alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" noWrap>
                                  {name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {review.createdAt ? fDate(review.createdAt) : ''}
                                </Typography>
                              </Stack>
                            </Stack>
                            <Stack spacing={1} flexGrow={1} sx={{ minWidth: 0 }}>
                              <Rating
                                size="small"
                                value={Number(review.rating)}
                                precision={0.1}
                                readOnly
                                sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' } }}
                              />
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {review.feedback?.trim() || 'No review added by user.'}
                              </Typography>
                            </Stack>
                            <IconButton
                              aria-label="Delete review"
                              onClick={() => openDeleteConfirm(review)}
                              color="error"
                              sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                            >
                              <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                            </IconButton>
                          </Stack>
                        );
                      })}
                      {pageCount > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                          <Pagination
                            count={pageCount}
                            page={reviewsPage}
                            onChange={(_, value) => setReviewsPage(value)}
                            color="primary"
                            shape="rounded"
                            showFirstButton
                            showLastButton
                            sx={{
                              [`& .${paginationClasses.ul}`]: { justifyContent: 'center' },
                            }}
                          />
                        </Box>
                      )}
                    </>
                  );
                })()}
              </Stack>
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        title="Delete review"
        content="Are you sure you want to delete this review? This action cannot be undone."
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDeleteReview} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        }
      />
    </DashboardContent>
  );
}
