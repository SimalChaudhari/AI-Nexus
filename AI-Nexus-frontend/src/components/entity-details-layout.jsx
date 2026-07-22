import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { alpha, useTheme } from '@mui/material/styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';

// Generic details layout for profile-style pages (User, Category, etc.)
// header: {
//   backgroundImage?: string;
//   backgroundGradient?: boolean;
//   avatarText?: string;
//   avatarSrc?: string; // optional photo (e.g. speaker profile)
//   avatarAlt?: string;
//   title: string;
//   subtitle?: string;
//   chips?: Array<{ label: string; color?: any; variant?: 'filled' | 'outlined' | 'soft'; icon?: string }>;
// }
// sections: Array<{
//   title: string;
//   icon?: string;
//   rows: Array<{ label: string; value: React.ReactNode }>;
// }>

export function EntityDetailsLayout({
  heading,
  links,
  editHref,
  header,
  sections,
  footer,
  belowHeader,
  content,
}) {
  const theme = useTheme();
  const showSections = content == null && Array.isArray(sections) && sections.length > 0;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={heading}
        links={links}
        action={
          editHref ? (
            <Button
              href={editHref}
              component="a"
              variant="contained"
              startIcon={<Iconify icon="solar:pen-bold" />}
            >
              Edit
            </Button>
          ) : null
        }
        sx={{ mb: { xs: 3, md: 4 } }}
      />

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: theme.customShadows?.z16 || undefined,
        }}
      >
        <Box
          sx={{
            height: 200,
            backgroundImage: header?.backgroundImage
              ? `url(${header.backgroundImage})`
              : header?.backgroundGradient
                ? `linear-gradient(135deg, ${alpha(
                    theme.palette.primary.main,
                    0.12
                  )}, ${alpha(theme.palette.secondary.main, 0.12)})`
                : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Box sx={{ px: { xs: 2, md: 4 }, pb: 2.5 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            sx={{ mt: -6 }}
          >
            <Stack direction="column" spacing={1} alignItems="center" textAlign="center">
              {(header?.avatarText || header?.avatarSrc) && (
                <Avatar
                  src={header.avatarSrc || undefined}
                  alt={header.avatarAlt || header?.title || ''}
                  sx={{
                    width: 72,
                    height: 72,
                    border: `3px solid ${theme.palette.background.paper}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.9),
                    fontSize: 30,
                    fontWeight: 700,
                  }}
                >
                  {header.avatarText}
                </Avatar>
              )}
              <Stack spacing={0.5} sx={{ textAlign: 'center', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ textAlign: 'center' }}>
                  {header?.title}
                </Typography>
                {header?.subtitle && (
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', textAlign: 'center' }}
                  >
                    {header.subtitle}
                  </Typography>
                )}
                {Array.isArray(header?.chips) && header.chips.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                    {header.chips.map((chip, index) => (
                      <Chip
                        key={`${chip.label}-${index}`}
                        size="small"
                        color={chip.color || 'default'}
                        variant={chip.variant || 'soft'}
                        icon={
                          chip.icon ? <Iconify icon={chip.icon} width={16} /> : undefined
                        }
                        label={chip.label}
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Card>

      {belowHeader ? <Box sx={{ mb: 3 }}>{belowHeader}</Box> : null}

      {content != null ? content : null}

      {/* Sections */}
      {showSections ? (
      <Card
        sx={{
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
          borderRadius: 2,
          boxShadow: theme.customShadows?.z8 || undefined,
        }}
      >
        <Grid container spacing={{ xs: 3, md: 4 }}>
          {sections.map((section, idx) => (
              <Grid
                key={section.title || idx}
                xs={12}
                md={
                  section.fullWidth ? 12 : Math.max(12 / sections.length, 6)
                }
              >
                <Typography
                  variant="subtitle1"
                  sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
                >
                  {section.icon && (
                    <Iconify icon={section.icon} width={20} sx={{ mr: 1 }} />
                  )}
                  {section.title}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {section.layout === 'grid' ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                      gap: 2,
                    }}
                  >
                    {Array.isArray(section.rows) &&
                      section.rows.map((row, rowIdx) => (
                        <Box key={`${row.label}-${rowIdx}`}>
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}
                          >
                            {row.label}
                          </Typography>
                          {(() => {
                            const v = row.value;
                            if (v === null || v === undefined) {
                              return (
                                <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.35 }}>
                                  -
                                </Typography>
                              );
                            }
                            if (
                              typeof v === 'string' ||
                              typeof v === 'number' ||
                              typeof v === 'boolean'
                            ) {
                              const display =
                                typeof v === 'string' && v.trim() === '' ? '-' : String(v);
                              return (
                                <Typography
                                  variant="body2"
                                  sx={{ color: 'text.primary', mt: 0.35, wordBreak: 'break-word' }}
                                >
                                  {display}
                                </Typography>
                              );
                            }
                            return <Box sx={{ mt: 0.35, width: '100%', maxWidth: '100%' }}>{v}</Box>;
                          })()}
                        </Box>
                      ))}
                  </Box>
                ) : (
                <Stack spacing={2}>
                  {Array.isArray(section.rows) &&
                    section.rows.map((row, rowIdx) => (
                      <Box key={`${row.label}-${rowIdx}`}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: 'text.secondary',
                            display: 'block',
                            fontWeight: 600,
                          }}
                        >
                          {row.label}
                        </Typography>
                        {/* Plain text in Typography; rich HTML (e.g. CKEditor) must not sit inside <p> */}
                        {(() => {
                          const v = row.value;
                          if (v === null || v === undefined) {
                            return (
                              <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.25 }}>
                                -
                              </Typography>
                            );
                          }
                          if (
                            typeof v === 'string' ||
                            typeof v === 'number' ||
                            typeof v === 'boolean'
                          ) {
                            const display =
                              typeof v === 'string' && v.trim() === '' ? '-' : String(v);
                            return (
                              <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.25 }}>
                                {display}
                              </Typography>
                            );
                          }
                          return (
                            <Box sx={{ mt: 0.25, width: '100%', maxWidth: '100%' }}>{v}</Box>
                          );
                        })()}
                        {rowIdx < section.rows.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                      </Box>
                    ))}
                </Stack>
                )}
              </Grid>
            ))}
        </Grid>
      </Card>
      ) : null}

      {footer ? <Box sx={{ mt: 3 }}>{footer}</Box> : null}
    </DashboardContent>
  );
}

