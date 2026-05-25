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
import { HomeTestimonialsSection } from '../home-testimonials-section';
import { HomeEmployeeSection } from '../home-employee-section';
import { HomeFaqsSection } from '../home-faqs-section';

// ----------------------------------------------------------------------

export function HomeView() {
  const pageProgress = useScrollProgress();

  return (
    <>
      <ScrollProgress
        variant="linear"
        progress={pageProgress.scrollYProgress}
        sx={{ position: 'fixed' }}
      />

      <HomeHeroSection />

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
    </>
  );
}
