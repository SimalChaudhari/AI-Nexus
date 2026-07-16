import { m } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAuthContext } from 'src/auth/hooks';
import { GradientButton } from 'src/components/custom-button';
import { RichTextContent } from 'src/components/html-content';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { paths } from 'src/routes/paths';
import { appSettingsService } from 'src/services/app-settings.service';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import {
  MembershipSignupDialog,
  MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED,
} from 'src/sections/learning/components/membership-signup-dialog';
import {
  clearMembershipEligibilityDraftOnModalClose,
  continueMembershipSignupDialog,
} from 'src/utils/membership-eligibility-sso';

const DEFAULT_JOIN_CONTENT = {
  heading: 'Ready to Join the AI Revolution?',
  subtitle:
    'Connect with the brightest AI minds, learn cutting-edge techniques, and build the future together.',
  ctaLabel: 'Get Started Now',
  ctaHref: '',
  ctaIcon: 'mingcute:arrow-right-line',
};

function normalizeRichTextHtml(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

// ----------------------------------------------------------------------

export function HomeJoinSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticated } = useAuthContext();
  const [joinContent, setJoinContent] = useState(DEFAULT_JOIN_CONTENT);
  const [membershipSignupOpen, setMembershipSignupOpen] = useState(false);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        const remote = settings?.homeJoinContent;
        if (!remote || typeof remote !== 'object') {
          setJoinContent(DEFAULT_JOIN_CONTENT);
          return;
        }
        setJoinContent({
          heading: remote.heading?.trim() || DEFAULT_JOIN_CONTENT.heading,
          subtitle: remote.subtitle?.trim() || DEFAULT_JOIN_CONTENT.subtitle,
          ctaLabel: remote.ctaLabel?.trim() || DEFAULT_JOIN_CONTENT.ctaLabel,
          ctaHref: remote.ctaHref?.trim() || DEFAULT_JOIN_CONTENT.ctaHref,
          ctaIcon: remote.ctaIcon?.trim() || DEFAULT_JOIN_CONTENT.ctaIcon,
        });
      })
      .catch(() => {
        if (active) setJoinContent(DEFAULT_JOIN_CONTENT);
      });

    return () => {
      active = false;
    };
  }, []);

  const subtitleHtml = useMemo(() => normalizeRichTextHtml(joinContent.subtitle), [joinContent.subtitle]);
  const returnPath = `${location.pathname}${location.search || ''}`;

  const navigateAuthenticatedCta = useCallback(() => {
    const href = String(joinContent.ctaHref || '').trim();
    if (href) {
      if (/^https?:\/\//i.test(href)) {
        window.location.assign(href);
        return;
      }
      navigate(href);
      return;
    }
    navigate(paths.learning);
  }, [joinContent.ctaHref, navigate]);

  const handleGetStartedClick = useCallback(
    (event) => {
      event.preventDefault();
      if (!authenticated) {
        clearMembershipEligibilityDraftOnModalClose();
        setMembershipSignupOpen(true);
        return;
      }
      navigateAuthenticatedCta();
    },
    [authenticated, navigateAuthenticatedCta]
  );

  return (
    <>
      <Box
        component="section"
        sx={{
          py: { xs: 10, md: 15 },
          bgcolor: 'grey.900',
        }}
      >
        <DashboardContent
          component={MotionViewport}
          sx={{
            maxWidth: 900,
            textAlign: 'center',
          }}
        >
          <Stack spacing={{ xs: 2.5, md: 4 }} component={m.div} variants={varFade().inUp}>
            <Typography
              variant="h2"
              sx={{
                ...HERO_TYPOGRAPHY.joinHeading,
                color: 'common.white',
                mb: 2,
                fontFamily: 'Montserrat, sans-serif',
                textWrap: 'balance',
                overflowWrap: 'anywhere',
              }}
            >
              {joinContent.heading}
            </Typography>

            <RichTextContent
              html={subtitleHtml}
              sx={{
                typography: 'h5',
                ...HERO_TYPOGRAPHY.joinSubtitle,
                color: 'grey.300',
                mb: 4,
                fontFamily: 'Montserrat, sans-serif',
                maxWidth: { xs: '100%', sm: 760 },
                mx: 'auto',
                px: { xs: 0.5, sm: 0 },
                '&, & p, & li': { overflowWrap: 'anywhere' },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <GradientButton
                type="button"
                size="large"
                icon={joinContent.ctaIcon || DEFAULT_JOIN_CONTENT.ctaIcon}
                iconPosition="left"
                onClick={handleGetStartedClick}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  maxWidth: { xs: 280, sm: 'none' },
                  mx: 'auto',
                  px: { xs: 2.5, sm: 4 },
                  py: { xs: 1.25, sm: 1.8 },
                  fontSize: { xs: '0.98rem', sm: '1.125rem' },
                }}
              >
                {joinContent.ctaLabel}
              </GradientButton>
            </Box>
          </Stack>
        </DashboardContent>
      </Box>

      <MembershipSignupDialog
        entrySource={MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED}
        open={membershipSignupOpen}
        onClose={() => {
          clearMembershipEligibilityDraftOnModalClose();
          setMembershipSignupOpen(false);
        }}
        onContinue={(payload) => {
          setMembershipSignupOpen(false);
          continueMembershipSignupDialog({
            navigate,
            returnPath,
            authenticated,
            payload,
          });
        }}
      />
    </>
  );
}
