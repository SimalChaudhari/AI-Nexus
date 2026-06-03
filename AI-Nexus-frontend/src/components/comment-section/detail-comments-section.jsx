import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import {
  DETAIL_PAGE_CARD_PADDING,
  DETAIL_PAGE_CARD_SX,
  DETAIL_PAGE_SECTION_TITLE_SX,
} from 'src/components/page-section-header/detail-page-styles';

// ----------------------------------------------------------------------

export function DetailCommentsSection({ count, children }) {
  const theme = useTheme();

  return (
    <Box sx={{ ...DETAIL_PAGE_CARD_SX, mt: 2 }}>
      <Box
        sx={{
          px: { xs: 2, sm: 2.5, md: 3 },
          py: { xs: 1.5, sm: 2 },
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(145deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 65%)`,
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.25,
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.info.main, 0.14),
              color: 'info.main',
            }}
          >
            <Iconify icon="solar:chat-round-dots-bold" width={20} />
          </Box>
          <Typography component="h2" sx={{ ...DETAIL_PAGE_SECTION_TITLE_SX, mb: 0 }}>
            Comments ({count})
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ p: DETAIL_PAGE_CARD_PADDING }}>{children}</Box>
    </Box>
  );
}

/** Optional divider between list and compose form */
export function DetailCommentsSectionDivider() {
  return <Divider sx={{ my: 2 }} />;
}
