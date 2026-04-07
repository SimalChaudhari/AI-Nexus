import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

export function LessonImageViewer({
  images,
  currentIndex,
  onPrev,
  onNext,
  lockedOverlay,
  frameHeight,
  canPrev,
  canNext,
}) {
  const hasImages = Array.isArray(images) && images.length > 0;
  const safeIndex = hasImages
    ? Math.min(Math.max(currentIndex, 0), images.length - 1)
    : 0;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        boxShadow: (theme) => theme.customShadows.z8,
        overflow: 'hidden',
        border: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          bgcolor: 'grey.100',
          width: '100%',
          height: frameHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {hasImages ? (
          <Box
            component="img"
            key={images[safeIndex]}
            src={images[safeIndex]}
            alt=""
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No images for this lesson.
          </Typography>
        )}
        {lockedOverlay}
      </Box>
      {hasImages && images.length > 1 && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            onClick={onPrev}
            disabled={!canPrev}
          >
            Previous
          </Button>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {safeIndex + 1} / {images.length}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
            onClick={onNext}
            disabled={!canNext}
          >
            Next
          </Button>
        </Stack>
      )}
    </Box>
  );
}

