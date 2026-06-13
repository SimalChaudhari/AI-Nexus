import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { Iconify } from 'src/components/iconify';
import { MembershipFormBrand } from 'src/components/membership-form-brand';
import { StudentMembershipApplicationForm } from 'src/sections/learning/components/student-membership-application-form';
import {
  readMembershipApplicationCourseReturn,
  clearMembershipApplicationCourseReturn,
} from 'src/utils/membership-salesforce-session';

// ----------------------------------------------------------------------

export default function StudentMembershipApplicationPage() {
  const theme = useTheme();
  const { primary, secondary } = theme.palette;
  const router = useRouter();
  const [courseReturn] = useState(() => readMembershipApplicationCourseReturn());

  useEffect(() => {
    // Student membership form is public — no Salesforce SSO required before filling the form.
  }, []);

  const handleSubmitted = () => {
    clearMembershipApplicationCourseReturn();
    if (courseReturn) {
      window.location.href = courseReturn;
      return;
    }
    router.replace(paths.learning);
  };

  const handleBack = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      router.back();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: alpha(primary.main, 0.02),
        backgroundImage: `linear-gradient(180deg, ${alpha(primary.main, 0.06)} 0%, ${alpha(
          secondary.main,
          0.03
        )} 28%, ${theme.palette.background.default} 55%)`,
      }}
    >
      <Box
        component="header"
        sx={{
          px: { xs: 2, md: 4 },
          py: { xs: 2.5, md: 3 },
          borderBottom: `1px solid ${alpha(primary.main, 0.12)}`,
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <MembershipFormBrand />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              ISCA Student Membership application
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Complete each section, save your draft, then submit your application to ISCA eServices.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={handleBack}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
          >
            Back
          </Button>
        </Stack>
      </Box>

      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
        <StudentMembershipApplicationForm onSubmitted={handleSubmitted} fullPage />
      </Box>
    </Box>
  );
}
