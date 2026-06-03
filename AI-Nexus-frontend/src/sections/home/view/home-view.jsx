import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { ScrollProgress, useScrollProgress } from 'src/components/animate/scroll-progress';
import { HomeFooter } from 'src/layouts/main/footer';
import { layoutClasses } from 'src/layouts/classes';
import { frontendContentSx } from 'src/layouts/main/frontend-content-layout';

import { ContactSection } from 'src/sections/contact/view/contact-view';

import { useMembershipApplicationPaymentReturn } from '../hooks/use-membership-application-payment-return';
import { useHomePageApisReady } from '../hooks/use-home-page-apis-ready';
import { HomeHeroSection } from '../home-hero-section';
import { HomeProgrammeStructureSection } from '../home-programme-structure-section';
import { HomeEligibilityMembershipSection } from '../home-eligibility-membership-section';
import { HomeCeoLaunchSection } from '../home-ceo-launch-section';
import { HomeCurriculumSection } from '../home-curriculum-section';
import { HomeProgrammeFeesSection } from '../home-programme-fees-section';
import { HomeTestimonialsSection } from '../home-testimonials-section';
import { HomeEmployeeSection } from '../home-employee-section';
import { HomeEmployerSection } from '../home-employer-section';
import { HomeFaqsSection } from '../home-faqs-section';

// ----------------------------------------------------------------------

export function HomeView() {
  const pageProgress = useScrollProgress();
  const footerReady = useHomePageApisReady();
  useMembershipApplicationPaymentReturn();

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        bgcolor: '#ffffff',
        '--layout-dashboard-content-px': {
          xs: '16px',
          sm: '24px',
          md: '32px',
          lg: '48px',
          xl: '64px',
        },
        [`& .${layoutClasses.content}`]: frontendContentSx,
      }}
    >
      <ScrollProgress
        variant="linear"
        progress={pageProgress.scrollYProgress}
        sx={{ position: 'fixed' }}
      />

      <HomeHeroSection />

      <HomeProgrammeStructureSection />

      <HomeEligibilityMembershipSection />

      <HomeCeoLaunchSection />

      <Stack sx={{ position: 'relative', bgcolor: 'background.default' }}>
        <HomeCurriculumSection />
        <HomeProgrammeFeesSection />
        <HomeTestimonialsSection />
        <HomeEmployeeSection />
       
        <ContactSection hideWhenEmpty />

        <HomeFaqsSection />
      </Stack>

      {footerReady ? <HomeFooter sx={{ mt: 0 }} /> : null}
    </Box>
  );
}
