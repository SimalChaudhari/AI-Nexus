import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { FaqsHero } from '../faqs-hero';
import { FaqsList } from '../faqs-list';
import { FaqsForm } from '../faqs-form';
import { FaqsCategory } from '../faqs-category';
import { appSettingsService } from 'src/services/app-settings.service';

// ----------------------------------------------------------------------

const DEFAULT_PAGE_HEADING = 'Frequently asked questions';

export function FaqsView() {
  const [loading, setLoading] = useState(true);
  const [pageHeading, setPageHeading] = useState(DEFAULT_PAGE_HEADING);
  const [faqItems, setFaqItems] = useState([]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const remoteFaq = (await appSettingsService.getFaqContent()) || {};
        if (!active) return;
        setPageHeading(String(remoteFaq?.pageHeading || '').trim() || DEFAULT_PAGE_HEADING);
        setFaqItems(Array.isArray(remoteFaq?.items) ? remoteFaq.items : []);
      } catch {
        if (active) {
          setPageHeading(DEFAULT_PAGE_HEADING);
          setFaqItems([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <FaqsHero />

      <Container sx={{ pb: 10, pt: { xs: 10, md: 15 }, position: 'relative' }}>
        <FaqsCategory />

        <Typography variant="h3" sx={{ my: { xs: 5, md: 10 } }}>
          {pageHeading}
        </Typography>

        <Box
          gap={10}
          display="grid"
          gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <FaqsList items={faqItems} />
          )}

          <FaqsForm />
        </Box>
      </Container>
    </>
  );
}
