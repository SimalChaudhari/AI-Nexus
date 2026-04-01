import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

const CATEGORIES = [
  {
    title: 'Announcements',
    description: 'Stay up to date on the most recent updates and news',
    icon: 'solar:speaker-bold-duotone',
    color: 'info',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', // Cyan to Blue
    count: '27',
    path: paths.announcements,
  },
  {
    title: 'AI Forum',
    description: 'For troubleshooting issues, understanding nodes, or reporting bugs—if you\'re building a workflow and need help shaping it, post here',
    icon: 'solar:chat-round-bold-duotone',
    color: 'primary',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', // Purple to Pink
    count: '28',
    path: paths.aiForum.root,
  },
  {
    title: 'Built with AI Nexus',
    description: 'This is a category for showing off the projects that you\'ve built. Share your workflows, nodes, and automation solutions',
    icon: 'solar:rocket-bold-duotone',
    color: 'warning',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)', // Orange to Yellow
    count: '42',
    path: paths.builtWith,
  },
];

export function CategoriesView() {
  const theme = useTheme();

  return (
    <DashboardContent>
      <Box sx={{ maxWidth: 'fullWidth', mx: 'auto' }}>
        {/* Header Section */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.info.main, 0.2)})`,
              }}
            >
              <Iconify
                icon="solar:widget-bold-duotone"
                width={32}
                sx={{ color: 'primary.main' }}
              />
            </Box>
          </Stack>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 800,
              color: 'text.primary',
              mb: 1.5,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Categories
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1rem', md: '1.125rem' },
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Explore different sections of our community and discover amazing content
          </Typography>
        </Box>

        {/* Categories Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
            },
            gap: 4,
          }}
        >
          {CATEGORIES.map((category, index) => (
            <Card
              key={category.title}
              component={RouterLink}
              href={category.path}
              sx={{
                p: 0,
                textDecoration: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                '&:hover': {
                  boxShadow: `0 12px 40px ${alpha(theme.palette[category.color].main, 0.24)}`,
                  transform: 'translateY(-8px)',
                  borderColor: alpha(theme.palette[category.color].main, 0.4),
                  '& .category-icon-box': {
                    transform: 'scale(1.05)',
                    bgcolor: `${category.color}.main`,
                    '& .category-icon': {
                      color: '#FFFFFF',
                      transform: 'scale(1.1) rotate(5deg)',
                    },
                  },
                  '& .view-link': {
                    transform: 'translateX(8px)',
                  },
                  '& .bg-decoration': {
                    transform: 'scale(1.5)',
                    opacity: 0.6,
                  },
                },
              }}
            >
              {/* Gradient Background Decoration */}
              <Box
                className="bg-decoration"
                sx={{
                  position: 'absolute',
                  top: -80,
                  right: -80,
                  width: 250,
                  height: 250,
                  borderRadius: '50%',
                  background: category.gradient,
                  filter: 'blur(60px)',
                  transition: 'all 0.4s',
                  opacity: 0.15,
                }}
              />

              <Box sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                <Stack spacing={3}>
                  {/* Icon and Count */}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box
                      className="category-icon-box"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 72,
                        height: 72,
                        borderRadius: 2.5,
                        background: `linear-gradient(135deg, ${alpha(theme.palette[category.color].main, 0.15)}, ${alpha(theme.palette[category.color].main, 0.08)})`,
                        transition: 'all 0.3s',
                        boxShadow: `0 4px 20px ${alpha(theme.palette[category.color].main, 0.25)}`,
                        border: `1px solid ${alpha(theme.palette[category.color].main, 0.2)}`,
                      }}
                    >
                      <Iconify
                        className="category-icon"
                        icon={category.icon}
                        width={36}
                        sx={{
                          color: `${category.color}.main`,
                          transition: 'all 0.3s',
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                        }}
                      />
                    </Box>

                    <Stack
                      spacing={0.5}
                      alignItems="flex-end"
                      sx={{
                        px: 2.5,
                        py: 1.5,
                        borderRadius: 2,
                        background: category.gradient,
                        border: `1px solid ${alpha(theme.palette[category.color].main, 0.3)}`,
                        boxShadow: `0 4px 12px ${alpha(theme.palette[category.color].main, 0.3)}`,
                      }}
                    >
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 800,
                          color: '#FFFFFF',
                          lineHeight: 1,
                        }}
                      >
                        {category.count}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.9)',
                          textTransform: 'uppercase',
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          letterSpacing: 0.5,
                        }}
                      >
                        Items
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Title */}
                  <Box>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        mb: 1,
                        fontSize: { xs: '1.5rem', md: '1.75rem' },
                      }}
                    >
                      {category.title}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        lineHeight: 1.8,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontSize: '0.9375rem',
                      }}
                    >
                      {category.description}
                    </Typography>
                  </Box>

                  {/* View Link with Arrow */}
                  <Stack
                    className="view-link"
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      pt: 2,
                      transition: 'transform 0.3s',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: `${category.color}.main`,
                        fontSize: '0.9375rem',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Explore
                    </Typography>
                    <Iconify
                      icon="solar:alt-arrow-right-bold"
                      width={20}
                      sx={{ color: `${category.color}.main` }}
                    />
                  </Stack>
                </Stack>
              </Box>
            </Card>
          ))}
        </Box>
      </Box>
    </DashboardContent>
  );
}





