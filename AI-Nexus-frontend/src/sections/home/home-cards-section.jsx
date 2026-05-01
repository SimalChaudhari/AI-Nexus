import { m } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';

import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';

// ----------------------------------------------------------------------

const CARDS = [
  {
    icon: 'mingcute:user-group-line',
    title: 'AI Communities',
    description:
      'Discover and join specialized AI communities. From machine learning to robotics, find your tribe of AI enthusiasts and experts.',
  },
  {
    icon: 'mingcute:flash-line',
    title: 'Smart Learning',
    description:
      'AI-powered learning paths that adapt to your skill level. Gamified experiences with achievements and personalized recommendations.',
  },
  {
    icon: 'mingcute:git-branch-line',
    title: 'AI Resources',
    description:
      'Build and share intelligent AI resources. Automate tasks with AI agents and find useful prompts and tools.',
  },
];

const DEFAULT_CARDS_CONTENT = {
  heading: 'Powered by',
  headingAccent: 'Artificial Intelligence',
  headingColor: '',
  headingAccentColor: '',
  subtitle: 'Experience the future of community learning with AI-driven features that adapt to your needs',
  cards: CARDS,
};

// ----------------------------------------------------------------------

export function HomeCardsSection() {
  const [cardsContent, setCardsContent] = useState(DEFAULT_CARDS_CONTENT);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        const remote = settings?.homeCardsContent;
        if (!remote || typeof remote !== 'object') {
          setCardsContent(DEFAULT_CARDS_CONTENT);
          return;
        }
        const remoteCards = Array.isArray(remote.cards) ? remote.cards : [];
        const mergedCards = (remoteCards.length ? remoteCards : CARDS).map((card, i) => ({
          icon: card?.icon?.trim() || CARDS[i % CARDS.length].icon,
          title: card?.title?.trim() || CARDS[i % CARDS.length].title,
          description: card?.description?.trim() || CARDS[i % CARDS.length].description,
        }));
        setCardsContent({
          heading: remote.heading?.trim() || DEFAULT_CARDS_CONTENT.heading,
          headingAccent: remote.headingAccent?.trim() || DEFAULT_CARDS_CONTENT.headingAccent,
          headingColor: remote.headingColor?.trim() || DEFAULT_CARDS_CONTENT.headingColor,
          headingAccentColor: remote.headingAccentColor?.trim() || DEFAULT_CARDS_CONTENT.headingAccentColor,
          subtitle: remote.subtitle?.trim() || DEFAULT_CARDS_CONTENT.subtitle,
          cards: mergedCards,
        });
      })
      .catch(() => {
        if (active) setCardsContent(DEFAULT_CARDS_CONTENT);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleCards = useMemo(
    () =>
      (Array.isArray(cardsContent.cards) ? cardsContent.cards : CARDS)
        .map((card, i) => ({
          icon: card?.icon || CARDS[i % CARDS.length].icon,
          title: card?.title || CARDS[i % CARDS.length].title,
          description: card?.description || CARDS[i % CARDS.length].description,
        })),
    [cardsContent.cards]
  );
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 4, md: 8 },
        bgcolor: 'background.default',
      }}
    >
      <DashboardContent component={MotionViewport}>
        <Stack
          spacing={1}
          sx={{
            textAlign: { xs: 'center', lg: 'center' },
            // maxWidth: { lg: '50%' },
            mb: 6,
          }}
        >
          <Box component={m.div} variants={varFade().inUp}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', md: '2.5rem' },
                fontWeight: 'bold',
                mb: 2,
                color: cardsContent.headingColor || 'text.primary',
              }}
            >
              {cardsContent.heading}{' '}
              <Box
                component="span"
                sx={{
                  color: cardsContent.headingAccentColor || 'primary.main',
                }}
              >
                {cardsContent.headingAccent}
              </Box>
            </Typography>
          </Box>

          <Box component={m.div} variants={varFade().inUp}>
            <RichTextContent
              html={cardsContent.subtitle}
              sx={{
                // typography: { xs: 'body1', md: 'body2' },
                fontSize: '0.875rem',
                color: 'text.secondary',
                maxWidth: { xs: '100%', lg: '90%' },
              }}
            />
          </Box>
        </Stack>

        <Grid container spacing={3}>
          {visibleCards.map((card, index) => (
            <Grid key={`${card.title}-${index}`} xs={12} md={4}>
              <Box
                component={m.div}
                variants={varFade().inUp}
                sx={{
                  height: 1,
                  p: 4,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  boxShadow: (theme) => theme.shadows[2],
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: (theme) => theme.shadows[8],
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #56c7da, #fcd60b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                  }}
                >
                  <Iconify icon={card.icon} width={32} sx={{ color: 'common.white' }} />
                </Box>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    color: 'text.primary',
                  }}
                >
                  {card.title}
                </Typography>

                <RichTextContent
                  html={card.description}
                  sx={{
                    '&, & p, & li': {
                      color: 'text.secondary',
                    },
                    color: 'text.secondary',
                    lineHeight: 1.8,
                    fontSize: '0.875rem',
                  }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </DashboardContent>
    </Box>
  );
}

