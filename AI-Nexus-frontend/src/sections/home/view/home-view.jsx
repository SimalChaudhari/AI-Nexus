import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import { ScrollProgress, useScrollProgress } from 'src/components/animate/scroll-progress';
import { HomeFooter } from 'src/layouts/main/footer';
import { layoutClasses } from 'src/layouts/classes';
import { frontendContentSx } from 'src/layouts/main/frontend-content-layout';
import { useAuthContext } from 'src/auth/hooks';
import {
  MembershipSignupDialog,
  MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED,
} from 'src/sections/learning/components/membership-signup-dialog';
import {
  clearMembershipEligibilityDraftOnModalClose,
  continueMembershipSignupDialog,
  RESUME_MEMBERSHIP_SIGNUP_QUERY,
} from 'src/utils/membership-eligibility-sso';

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
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticated } = useAuthContext();
  const pageProgress = useScrollProgress();
  const footerReady = useHomePageApisReady();
  useMembershipApplicationPaymentReturn();
  const [membershipSignupOpen, setMembershipSignupOpen] = useState(false);
  const [notEligibleOpen, setNotEligibleOpen] = useState(false);
  const returnPath = `${location.pathname}${location.search || ''}`;

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    if (params.get(RESUME_MEMBERSHIP_SIGNUP_QUERY) === '1') {
      setMembershipSignupOpen(true);
      return;
    }
    if (params.get('membershipNotEligible') === '1') {
      setNotEligibleOpen(true);
    }
  }, [location.search]);

  const handleCloseNotEligible = useCallback(() => {
    setNotEligibleOpen(false);
    const params = new URLSearchParams(location.search || '');
    if (params.has('membershipNotEligible')) {
      params.delete('membershipNotEligible');
      const next = params.toString();
      navigate(`${location.pathname}${next ? `?${next}` : ''}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const handleOpenMembershipSignup = useCallback(() => {
    setMembershipSignupOpen(true);
  }, []);

  const handleCloseMembershipSignup = useCallback(() => {
    clearMembershipEligibilityDraftOnModalClose();
    setMembershipSignupOpen(false);
  }, []);

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

      <HomeHeroSection onOpenMembershipSignup={handleOpenMembershipSignup} />

      <HomeProgrammeStructureSection />

      <HomeEligibilityMembershipSection onOpenMembershipSignup={handleOpenMembershipSignup} />

      <HomeCeoLaunchSection />

      <Stack sx={{ position: 'relative', bgcolor: 'background.default' }}>
        <HomeCurriculumSection />
        <HomeProgrammeFeesSection />
        {/* <HomeTestimonialsSection /> */}
        <HomeEmployeeSection />
       
        <ContactSection hideWhenEmpty />

        <HomeFaqsSection />
      </Stack>

      {footerReady ? <HomeFooter sx={{ mt: 0 }} /> : null}

      <MembershipSignupDialog
        entrySource={MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED}
        open={membershipSignupOpen}
        onClose={handleCloseMembershipSignup}
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

      <Dialog open={notEligibleOpen} onClose={handleCloseNotEligible} maxWidth="xs" fullWidth>
        <DialogTitle>Not eligible</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Your eServices sign-in is not mapped to an active ISCA member profile for this flow.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNotEligible} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
