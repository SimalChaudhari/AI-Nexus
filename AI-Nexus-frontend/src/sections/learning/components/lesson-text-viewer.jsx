import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import {
  getLessonMediaFrameSx,
  LESSON_MEDIA_FRAME_HEIGHT,
} from 'src/sections/learning/utils/player-responsive-type';

export function LessonTextViewer({
  html,
  lockedOverlay,
  frameHeight = LESSON_MEDIA_FRAME_HEIGHT,
}) {
  const theme = useTheme();

  return (
    <Box sx={getLessonMediaFrameSx(theme, frameHeight)}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'auto',
          p: { xs: 2, sm: 2.5 },
          bgcolor: 'background.paper',
          color: 'text.primary',
          textAlign: 'left',
          '& img': { maxWidth: '100%', height: 'auto' },
          '& pre': { overflowX: 'auto', maxWidth: '100%' },
          '& p': { marginBottom: 1.5 },
          '& h1, & h2, & h3': { marginTop: 2, marginBottom: 1 },
        }}
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />
      {lockedOverlay}
    </Box>
  );
}
