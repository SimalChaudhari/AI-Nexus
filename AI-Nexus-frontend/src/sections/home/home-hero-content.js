import { paths } from 'src/routes/paths';

/**
 * Marketing copy + stats for the public home hero.
 * Edit here (or later wire to CMS / app-settings) — shape matches the hero UI.
 */
export const HOME_HERO_DATA = {
  headline: 'Transform Your Career with AI in One Weekend',
  description:
    'Master AI in one weekend and become the go-to expert for AI solutions.',
  cta: {
    label: 'Begin with Free Mastermind',
    href: paths.learning,
  },
  event: {
    startDateLabel: 'Start Date',
    startDate: '27 Mar 2026',
    startTimeLabel: 'Start Time',
    startTime: '10 AM EST',
  },
  stats: [
    { value: '10M+', label: 'Active Learners' },
    { value: '160+', label: 'Countries' },
    { value: '4.9/5', label: 'Rating' },
  ],
};
