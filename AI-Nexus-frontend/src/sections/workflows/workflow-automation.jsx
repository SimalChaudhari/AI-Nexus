import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { useAuthContext } from 'src/auth/hooks';

import { Iconify } from 'src/components/iconify';
import { GradientButton } from 'src/components/custom-button';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

export function WorkflowAutomation() {
  const router = useRouter();
  const { authenticated } = useAuthContext();

  const handleCreateWorkflow = useCallback(() => {
    if (authenticated) {
      router.push(paths.admin.workflow.new);
    } else {
      // If not authenticated, stay on AI resources page (scroll to top or show message)
      router.push(paths.workflows);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [authenticated, router]);

  return (
       <Box
        sx={{
          textAlign: 'center',
          // mb: { xs: 6, md: 8 },
          px: { xs: 2, md: 0 },
        }}
      >
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' },
            fontWeight: 'bold',
            color: 'text.primary',
            mb: { xs: 2, md: 3 },
          }}
        >
          AI Resources
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
            color: 'text.secondary',
            maxWidth: 800,
            mx: 'auto',
            mb: { xs: 4, md: 6 },
            lineHeight: 1.7,
          }}
        >
          Discover and manage AI resources for your community — templates, guides, and automations in one place.
        </Typography>
      </Box>
  
  );
}

