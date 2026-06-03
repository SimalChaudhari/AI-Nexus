import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { DETAIL_PAGE_CARD_PADDING, DETAIL_PAGE_CARD_SX, DETAIL_PAGE_TITLE_SX } from 'src/components/page-section-header/detail-page-styles';

// ----------------------------------------------------------------------

function MetaChip({ icon, value, label }) {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{
        px: 1.25,
        py: 0.5,
        borderRadius: 999,
        bgcolor: alpha(theme.palette.grey[500], 0.08),
        border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
      }}
    >
      <Iconify
        icon={icon}
        width={16}
        sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
      />
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {value}
      </Typography>
      {label ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      ) : null}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function DetailPostCard({
  title,
  headerIcon = 'solar:document-text-bold-duotone',
  headerGradient = 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  creator,
  metaItems = [],
  children,
}) {
  const theme = useTheme();

  return (
    <Box sx={DETAIL_PAGE_CARD_SX}>
      <Box
        sx={{
          p: DETAIL_PAGE_CARD_PADDING,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 70%)`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              background: headerGradient,
              flexShrink: 0,
              boxShadow: `0 6px 16px ${alpha(theme.palette.grey[900], 0.12)}`,
            }}
          >
            <Iconify icon={headerIcon} width={24} sx={{ color: 'common.white' }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h1" sx={{ ...DETAIL_PAGE_TITLE_SX, mb: 1.25 }}>
              {title}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
              sx={{ gap: 1 }}
            >
              {creator ? (
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{
                    px: 1,
                    py: 0.35,
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                  }}
                >
                  <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem' }}>{creator.initials}</Avatar>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    Created by {creator.name}
                  </Typography>
                </Stack>
              ) : null}
              {metaItems.map((item) => (
                <MetaChip
                  key={item.key || `${item.icon}-${item.label}`}
                  icon={item.icon}
                  value={item.value}
                  label={item.label}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Box
        sx={{
          p: DETAIL_PAGE_CARD_PADDING,
          overflow: 'visible',
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: '12px',
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.grey[500], 0.03),
            boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.6)}`,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
