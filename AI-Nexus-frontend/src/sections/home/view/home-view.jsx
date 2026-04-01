import Stack from '@mui/material/Stack';

import { BackToTop } from 'src/components/animate/back-to-top';
import { ScrollProgress, useScrollProgress } from 'src/components/animate/scroll-progress';

import { HomeHeroSection } from '../home-hero-section';
import { HomeCardsSection } from '../home-cards-section';
import { HomeCounterSection } from '../home-counter-section';
import { HomeCommunitiesSection } from '../home-communities-section';
import { HomeJoinSection } from '../home-join-section';

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

      <BackToTop />

      <HomeHeroSection />

      <Stack sx={{ position: 'relative', bgcolor: 'background.default' }}>
        <HomeCardsSection />

        <HomeCounterSection />

        <HomeCommunitiesSection />

        <HomeJoinSection />
      </Stack>
    </>
  );
}
