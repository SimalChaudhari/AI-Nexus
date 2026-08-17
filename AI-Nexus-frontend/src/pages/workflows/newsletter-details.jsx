import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';
import { LoadingScreen } from 'src/components/loading-screen';
import { EmptyContent } from 'src/components/empty-content';
import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { newsletterService } from 'src/services/newsletter.service';
import { NewsletterDocumentViewer } from 'src/sections/workflows/newsletter-document-viewer';

export default function WorkflowNewsletterDetailsPage() {
  const { id = '' } = useParams();
  const [newsletter, setNewsletter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await newsletterService.getNewsletterById(id);
        if (mounted) setNewsletter(data);
      } catch (error) {
        if (mounted) setNewsletter(null);
        toast.error(error?.message || 'Unable to load this newsletter');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!newsletter) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Newsletter not found"
          action={
            <Button
              component={RouterLink}
              href={`${paths.workflows}?tab=newsletter`}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to Newsletter
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  const isPdf = newsletter.format === 'pdf';

  return (
    <>
      <Helmet>
        <title>{`${newsletter.title || 'Newsletter'} | ${CONFIG.site.name}`}</title>
      </Helmet>
      <DashboardContent
        sx={
          isPdf
            ? {
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 auto',
                minHeight: {
                  xs: 'calc(100dvh - var(--layout-header-mobile-height, 64px))',
                  md: 'calc(100dvh - var(--layout-header-desktop-height, 72px))',
                },
                pb: { xs: 2, md: 3 },
              }
            : undefined
        }
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: { xs: 2, md: 2.5 }, flexShrink: 0 }}
        >
          <Button
            component={RouterLink}
            href={`${paths.workflows}?tab=newsletter`}
            color="inherit"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            Back to Newsletter
          </Button>
          {isPdf && newsletter.fileUrl ? (
            <Stack direction="row" spacing={1} sx={{ width: { xs: 1, sm: 'auto' } }}>
              <Button
                href={newsletter.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                color="inherit"
                sx={{ flex: { xs: 1, sm: 'unset' } }}
              >
                Open PDF
              </Button>
              <Button
                href={newsletter.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                variant="outlined"
                color="inherit"
                sx={{ flex: { xs: 1, sm: 'unset' } }}
              >
                Download
              </Button>
            </Stack>
          ) : null}
        </Stack>

        <Box
          sx={
            isPdf
              ? { flex: '1 1 auto', minHeight: { xs: 360, md: 520 }, display: 'flex', width: 1 }
              : undefined
          }
        >
          <NewsletterDocumentViewer newsletter={newsletter} />
        </Box>
      </DashboardContent>
    </>
  );
}
