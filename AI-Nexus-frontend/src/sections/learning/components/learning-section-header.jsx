import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import {
  LEARNING_SECTION_HEADER_ICON_BOX_SX,
  LEARNING_SECTION_HEADER_SUBTITLE_SX,
  LEARNING_SECTION_HEADER_TITLE_SX,
  LEARNING_SECTION_HEADER_WRAPPER_SX,
} from '../learning-section-styles';

// ----------------------------------------------------------------------

export function LearningSectionHeader({ icon, iconGradient, title, subtitle }) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={LEARNING_SECTION_HEADER_WRAPPER_SX}
    >
      <Box sx={{ ...LEARNING_SECTION_HEADER_ICON_BOX_SX, background: iconGradient }}>
        <Iconify icon={icon} width={18} sx={{ color: 'common.white' }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h2" sx={LEARNING_SECTION_HEADER_TITLE_SX}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" sx={LEARNING_SECTION_HEADER_SUBTITLE_SX}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}
