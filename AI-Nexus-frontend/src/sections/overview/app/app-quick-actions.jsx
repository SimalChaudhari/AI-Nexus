import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const QUICK_ACTIONS = [
  {
    title: 'Courses',
    icon: 'solar:book-bold-duotone',
    path: paths.admin.course.list,
    color: 'primary',
  },
  {
    title: 'Orders',
    icon: 'solar:bag-check-bold-duotone',
    path: paths.admin.order.list,
    color: 'success',
  },
  {
    title: 'Users',
    icon: 'solar:users-group-rounded-bold-duotone',
    path: paths.admin.user.list,
    color: 'info',
  },
  {
    title: 'Weekly Metrics',
    icon: 'solar:chart-2-bold-duotone',
    path: paths.admin.weeklyMetrics,
    color: 'secondary',
  },
  {
    title: 'Settings',
    icon: 'solar:settings-bold-duotone',
    path: paths.admin.settings,
    color: 'warning',
  },
];

export function AppQuickActions({ compact = false, sx, ...other }) {
  const theme = useTheme();
  const router = useRouter();

  if (compact) {
    return (
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={sx}
        {...other}
      >
        {QUICK_ACTIONS.map((item) => {
          const palette = theme.palette[item.color] || theme.palette.primary;
          return (
            <Button
              key={item.title}
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon={item.icon} width={18} />}
              onClick={() => router.push(item.path)}
              sx={{
                borderColor: alpha(theme.palette.grey[500], 0.2),
                bgcolor: alpha(palette.main, 0.04),
                fontWeight: 600,
                '&:hover': {
                  borderColor: alpha(palette.main, 0.4),
                  bgcolor: alpha(palette.main, 0.1),
                },
              }}
            >
              {item.title}
            </Button>
          );
        })}
      </Stack>
    );
  }

  return (
    <Card
      sx={[
        {
          p: 2.5,
          height: 1,
          boxShadow: 'none',
          border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Shortcuts
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Common admin tasks
        </Typography>
      </Box>

      <Stack spacing={1} sx={{ flex: 1 }}>
        {QUICK_ACTIONS.map((item) => {
          const palette = theme.palette[item.color] || theme.palette.primary;
          return (
            <Button
              key={item.title}
              fullWidth
              color="inherit"
              onClick={() => router.push(item.path)}
              sx={{
                py: 1.25,
                px: 1.5,
                justifyContent: 'flex-start',
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                bgcolor: alpha(palette.main, 0.03),
                '&:hover': { bgcolor: alpha(palette.main, 0.08) },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  mr: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1.25,
                  color: palette.main,
                  bgcolor: alpha(palette.main, 0.12),
                }}
              >
                <Iconify icon={item.icon} width={20} />
              </Box>
              <Typography variant="subtitle2">{item.title}</Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Iconify icon="eva:arrow-ios-forward-fill" width={16} sx={{ color: 'text.disabled' }} />
            </Button>
          );
        })}
      </Stack>
    </Card>
  );
}
