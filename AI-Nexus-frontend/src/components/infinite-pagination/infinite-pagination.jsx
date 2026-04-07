import { useEffect, useRef } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from 'src/components/loading/circular-progress';

// ----------------------------------------------------------------------

export function InfinitePagination({
  hasMore,
  loading,
  onLoadMore,
  loadedCount,
  totalCount,
  itemLabel = 'items',
  disabled = false,
  sentinelSx,
  footerSx,
}) {
  const observerTarget = useRef(null);

  useEffect(() => {
    if (disabled || loading || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;

    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [disabled, hasMore, loading, onLoadMore]);

  return (
    <>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={40} />
        </Box>
      )}

      {hasMore && !loading && !disabled && (
        <Box
          ref={observerTarget}
          sx={{
            height: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...sentinelSx,
          }}
        />
      )}

      <Box sx={{ mt: 3, textAlign: 'center', ...footerSx }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Showing {loadedCount} of {totalCount} {itemLabel}
        </Typography>
      </Box>
    </>
  );
}
