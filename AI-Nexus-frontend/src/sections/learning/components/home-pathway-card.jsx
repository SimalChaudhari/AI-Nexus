import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Card body only: “About this pathway” + description + key criteria.
 *
 * @param {import('./home-pathway-content').HomePathwayContent} content
 */
export function HomePathwayInfoCard({ content }) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        borderColor: alpha(theme.palette.primary.main, 0.2),
        bgcolor: alpha(theme.palette.primary.main, 0.02),
      })}
    >
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          About this pathway
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {content.description}
        </Typography>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Key criteria
          </Typography>
          <Stack component="ul" spacing={1} sx={{ m: 0, pl: 0, listStyle: 'none' }}>
            {content.criteria.map((item) => (
              <Box
                key={item}
                component="li"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.25,
                }}
              >
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    width: 6,
                    height: 6,
                    mt: '0.55em',
                    borderRadius: '50%',
                    bgcolor: 'text.primary',
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  {item}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

/**
 * Full home pathway step: info card + explore links + footer note + action buttons.
 *
 * @param {object} props
 * @param {import('./home-pathway-content').HomePathwayContent} props.content
 * @param {string} props.applicationPortalUrl
 * @param {string} props.readPathwayPageUrl
 * @param {string} [props.exploreUrl]
 * @param {(link: { key?: string, title: string, subtitle: string }) => string} [props.resolveExploreUrl]
 * @param {(url: string) => void} props.onOpenLink
 */
export function HomePathwayCard({
  content,
  applicationPortalUrl,
  readPathwayPageUrl,
  exploreUrl = '',
  resolveExploreUrl,
  onOpenLink,
}) {
  const exploreLinks = content.exploreLinks || [];

  return (
    <Stack spacing={2.5}>
      <HomePathwayInfoCard content={content} />

      {exploreLinks.length > 0 && exploreUrl ? (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            You may also explore
          </Typography>
          <Stack spacing={1}>
            {exploreLinks.map((link) => (
              <Paper
                key={link.title}
                variant="outlined"
                onClick={() => {
                  const targetUrl = resolveExploreUrl ? resolveExploreUrl(link) : exploreUrl;
                  onOpenLink(targetUrl);
                }}
                sx={(theme) => ({
                  p: 1.5,
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  borderColor: theme.palette.divider,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    borderColor: theme.palette.text.primary,
                    bgcolor: alpha(theme.palette.text.primary, 0.04),
                  },
                })}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
                    {link.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {link.subtitle}
                  </Typography>
                </Box>
                <Iconify
                  icon="eva:external-link-fill"
                  width={20}
                  sx={{ color: 'text.secondary', flexShrink: 0 }}
                />
              </Paper>
            ))}
          </Stack>
        </Box>
      ) : null}

      {content.footerNote ? (
        <Typography variant="body2" color="text.secondary">
          {content.footerNote}
        </Typography>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ pt: 0.5, justifyContent: { sm: 'flex-start' } }}
      >
        <Button
          variant="contained"
          color="primary"
          endIcon={<Iconify icon="eva:external-link-fill" width={18} />}
          onClick={() => onOpenLink(applicationPortalUrl)}
          sx={{
            px: 2.5,
            py: 1.25,
            bgcolor: 'primary.dark',
            '&:hover': { bgcolor: 'primary.darker' },
          }}
        >
          Sign up on ISCA eServices
        </Button>
        <Button
          variant="outlined"
          color="primary"
          endIcon={<Iconify icon="eva:external-link-fill" width={18} />}
          onClick={() => onOpenLink(readPathwayPageUrl)}
          sx={{
            px: 2.5,
            py: 1.25,
            borderColor: 'primary.dark',
            color: 'primary.dark',
            '&:hover': {
              borderColor: 'primary.darker',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          Read the pathway page
        </Button>
      </Stack>
    </Stack>
  );
}
