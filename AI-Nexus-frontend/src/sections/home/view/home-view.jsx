import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { ScrollProgress, useScrollProgress } from 'src/components/animate/scroll-progress';

import { ContactSection } from 'src/sections/contact/view/contact-view';

import { HomeHeroSection } from '../home-hero-section';
import { HomeCardsSection } from '../home-cards-section';
import { HomeCounterSection } from '../home-counter-section';
import { HomeCommunitiesSection } from '../home-communities-section';
import { HomeJoinSection } from '../home-join-section';
import { HomeProgrammeFeesSection } from '../home-programme-fees-section';
import { HomeCurriculumSection } from '../home-curriculum-section';
import { HomeProgrammeStructureSection } from '../home-programme-structure-section';
import { HomeFundingEligibilitySection } from '../home-funding-eligibility-section';
import { HomeCeoLaunchSection } from '../home-ceo-launch-section';
import { HomeTestimonialsSection } from '../home-testimonials-section';
import { HomeEmployeeSection } from '../home-employee-section';
import { HomeFaqsSection } from '../home-faqs-section';

// ----------------------------------------------------------------------

export function HomeView() {
  const pageProgress = useScrollProgress();

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <ScrollProgress
        variant="linear"
        progress={pageProgress.scrollYProgress}
        sx={{ position: 'fixed' }}
      />

      <HomeHeroSection />

      <HomeProgrammeStructureSection />

      <HomeFundingEligibilitySection />

      <HomeCeoLaunchSection />

      <Stack sx={{ position: 'relative', bgcolor: 'background.default' }}>
        <HomeCardsSection />
        {/* <HomeCounterSection /> */}
        {/* <HomeCommunitiesSection /> */}
        <HomeJoinSection />
        <HomeCurriculumSection />
        <HomeProgrammeFeesSection />
        <HomeTestimonialsSection />
        <HomeEmployeeSection />
        <ContactSection />

        <HomeFaqsSection />
      </Stack>
    </Box>
  );
}
