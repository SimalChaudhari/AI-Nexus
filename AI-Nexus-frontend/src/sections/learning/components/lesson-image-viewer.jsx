import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import {
  getLessonMediaFrameInnerSx,
  getLessonMediaFrameSx,
  LESSON_MEDIA_FRAME_HEIGHT,
} from 'src/sections/learning/utils/player-responsive-type';

export function LessonImageViewer({
  images,
  currentIndex,
  onPrev,
  onNext,
  lockedOverlay,
  frameHeight = LESSON_MEDIA_FRAME_HEIGHT,
  canPrev,
  canNext,
}) {
  const theme = useTheme();
  const hasImages = Array.isArray(images) && images.length > 0;
  const safeIndex = hasImages
    ? Math.min(Math.max(currentIndex, 0), images.length - 1)
    : 0;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={getLessonMediaFrameSx(theme, frameHeight)}>
        <Box sx={getLessonMediaFrameInnerSx()}>
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
            <Typography variant="body2" sx={{ color: 'grey.400' }}>
              No images for this lesson.
            </Typography>
          )}
        </Box>
        {lockedOverlay}
      </Box>
      {hasImages && images.length > 1 && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={{ xs: 1, sm: 2 }}
          sx={{
            p: { xs: 1.25, sm: 1.5 },
            bgcolor: 'background.paper',
            border: (t) => `1px solid ${t.palette.divider}`,
            borderTop: 0,
            flexWrap: 'nowrap',
          }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            onClick={onPrev}
            disabled={!canPrev}
            sx={{ flexShrink: 0, minWidth: { xs: 36, sm: 'auto' }, px: { xs: 1, sm: 1.5 } }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Previous
            </Box>
          </Button>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              textAlign: 'center',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minWidth: { xs: 48, sm: 56 },
            }}
          >
            {safeIndex + 1} / {images.length}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
            onClick={onNext}
            disabled={!canNext}
            sx={{ flexShrink: 0, minWidth: { xs: 36, sm: 'auto' }, px: { xs: 1, sm: 1.5 } }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Next
            </Box>
          </Button>
        </Stack>
      )}
    </Box>
  );
}
