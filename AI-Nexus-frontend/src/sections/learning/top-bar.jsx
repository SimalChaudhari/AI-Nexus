import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { useCheckoutContext } from 'src/sections/checkout/context';

// ----------------------------------------------------------------------

export function LearningTopBar({
  activeTab,
  setActiveTab,
  showCart = false,
  /** When false (e.g. course player), bar is static inside a fixed-height shell so the layout column controls scroll. */
  sticky = true,
}) {
  const theme = useTheme();
  const checkout = useCheckoutContext();
  const cartCount = checkout.totalItems;

  return (
    <Box
      sx={{
        zIndex: 40,
        position: sticky ? 'sticky' : 'relative',
        ...(sticky ? { top: 0 } : { flexShrink: 0 }),
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
        bgcolor: 'primary.main',
        boxShadow: theme.customShadows.z8,
      }}
    >
      <DashboardContent
        sx={{
          py: { xs: 1.25, md: 1.5 },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 1.25, md: 2 }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          sx={{ width: '100%' }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ flex: 1, minWidth: 0, order: { xs: 2, md: 1 } }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                width: '100%',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
                pb: { xs: 0.25, md: 0 },
              }}
            >
              <Button
                onClick={() => setActiveTab('courses')}
                variant={activeTab === 'courses' ? 'contained' : 'text'}
                color={activeTab === 'courses' ? 'primary' : 'secondary'}
                sx={{
                  minWidth: 0,
                  flexShrink: 0,
                  px: { xs: 1.5, md: 2 },
                  py: { xs: 0.625, md: 0.75 },
                  borderRadius: 999,
                  textTransform: 'none',
                  fontSize: { xs: theme.typography.pxToRem(13), md: theme.typography.pxToRem(14) },
                  ...(activeTab !== 'courses' && {
                    color: 'common.black',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.black, 0.08),
                    },
                  }),
                  ...(activeTab === 'courses' && {
                    bgcolor: 'common.white',
                    color: 'common.black',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }),
                }}
              >
                All Courses
              </Button>
              <Button
                onClick={() => setActiveTab('progress')}
                variant={activeTab === 'progress' ? 'contained' : 'text'}
                color={activeTab === 'progress' ? 'primary' : 'secondary'}
                sx={{
                  minWidth: 0,
                  flexShrink: 0,
                  px: { xs: 1.5, md: 2 },
                  py: { xs: 0.625, md: 0.75 },
                  borderRadius: 999,
                  textTransform: 'none',
                  fontSize: { xs: theme.typography.pxToRem(13), md: theme.typography.pxToRem(14) },
                  ...(activeTab !== 'progress' && {
                    color: 'common.black',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.black, 0.08),
                    },
                  }),
                  ...(activeTab === 'progress' && {
                    bgcolor: 'common.white',
                    color: 'common.black',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }),
                }}
              >
                My Progress
              </Button>
              <Button
                onClick={() => setActiveTab('favorites')}
                variant={activeTab === 'favorites' ? 'contained' : 'text'}
                color={activeTab === 'favorites' ? 'primary' : 'secondary'}
                sx={{
                  minWidth: 0,
                  flexShrink: 0,
                  px: { xs: 1.5, md: 2 },
                  py: { xs: 0.625, md: 0.75 },
                  borderRadius: 999,
                  textTransform: 'none',
                  fontSize: { xs: theme.typography.pxToRem(13), md: theme.typography.pxToRem(14) },
                  ...(activeTab !== 'favorites' && {
                    color: 'common.black',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.black, 0.08),
                    },
                  }),
                  ...(activeTab === 'favorites' && {
                    bgcolor: 'common.white',
                    color: 'common.black',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }),
                }}
              >
                Favorites
              </Button>
              <Button
                onClick={() => setActiveTab('certificates')}
                variant={activeTab === 'certificates' ? 'contained' : 'text'}
                color={activeTab === 'certificates' ? 'primary' : 'secondary'}
                sx={{
                  minWidth: 0,
                  flexShrink: 0,
                  px: { xs: 1.5, md: 2 },
                  py: { xs: 0.625, md: 0.75 },
                  borderRadius: 999,
                  textTransform: 'none',
                  fontSize: { xs: theme.typography.pxToRem(13), md: theme.typography.pxToRem(14) },
                  ...(activeTab !== 'certificates' && {
                    color: 'common.black',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.black, 0.08),
                    },
                  }),
                  ...(activeTab === 'certificates' && {
                    bgcolor: 'common.white',
                    color: 'common.black',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }),
                }}
              >
                Certificates
              </Button>
            </Stack>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: 'space-between', md: 'flex-end' }}
            sx={{ flexShrink: 0, order: { xs: 1, md: 2 } }}
          >
            {showCart && (
              <Box
                component={RouterLink}
                to={paths.product.checkout}
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.primary',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.72),
                  transition: (t) => t.transitions.create(['opacity']),
                  '&:hover': { opacity: 0.72 },
                }}
              >
                <Badge showZero badgeContent={cartCount} color="error" max={99}>
                  <Iconify icon="solar:cart-3-bold" width={24} />
                </Badge>
              </Box>
            )}
          </Stack>
        </Stack>
      </DashboardContent>
    </Box>
  );
}
