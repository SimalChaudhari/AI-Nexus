import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { fDate } from 'src/utils/format-time';
import { newsletterService } from 'src/services/newsletter.service';
import { getNewsletterFormatLabel } from 'src/sections/dashboard/newsletter/newsletter-status';

// ----------------------------------------------------------------------

export function Newsletter() {
  const theme = useTheme();
  const router = useRouter();
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await newsletterService.getPublicNewsletters();
        if (mounted) setNewsletters(Array.isArray(data) ? data : []);
      } catch (error) {
        if (mounted) setNewsletters([]);
        toast.error(error?.message || 'Failed to load newsletters');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Box>
      <Box sx={{ mb: { xs: 2.5, md: 3 }, maxWidth: 720 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: 'text.primary',
            letterSpacing: '-0.02em',
            fontSize: { xs: 'clamp(1.125rem, 5vw + 0.25rem, 1.5rem)', sm: '1.5rem' },
            lineHeight: 1.25,
          }}
        >
          Newsletter
        </Typography>
        <Box
          sx={{
            mt: 1,
            mb: 0.25,
            width: 48,
            height: 3,
            borderRadius: 1,
            background: (t) =>
              `linear-gradient(90deg, ${t.palette.primary.main}, ${alpha(t.palette.secondary.main, 0.85)})`,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: 'text.secondary',
            mt: 0.75,
            fontSize: { xs: 'clamp(0.6875rem, 2.4vw + 0.42rem, 0.8125rem)', sm: '0.75rem' },
            lineHeight: 1.55,
          }}
        >
          Updates and briefings on AI for professional practice.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : newsletters.length === 0 ? (
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            px: 2,
            textAlign: 'center',
            borderRadius: 2,
            border: `1px dashed ${alpha(theme.palette.grey[500], 0.3)}`,
            bgcolor: alpha(theme.palette.grey[500], 0.04),
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            No issues available
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Newsletters will appear here when they are published.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {newsletters.map((item) => (
            <Grid key={item.id} xs={12} sm={6} md={4}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
                  boxShadow: 'none',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  '&:hover': {
                    boxShadow: theme.customShadows.z8,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => router.push(paths.workflowsNewsletter.details(item.id))}
                  sx={{ height: '100%', p: 2.5, alignItems: 'flex-start' }}
                >
                  <Stack spacing={1.5} sx={{ height: '100%' }}>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.04em' }}
                    >
                      {getNewsletterFormatLabel(item.format)}
                      {item.publishAt || item.createdAt
                        ? ` · ${fDate(item.publishAt || item.createdAt)}`
                        : ''}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
                      {item.title}
                    </Typography>
                    {item.summary ? (
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          flexGrow: 1,
                          lineHeight: 1.7,
                        }}
                      >
                        {item.summary}
                      </Typography>
                    ) : (
                      <Box sx={{ flexGrow: 1 }} />
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      Read more
                      <Iconify icon="eva:arrow-ios-forward-fill" width={14} />
                    </Typography>
                  </Stack>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
