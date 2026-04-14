import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';

// ----------------------------------------------------------------------

export function WorkflowAutomation() {
  const flowiseUrl = CONFIG.flowise.publicBaseUrl || 'http://localhost:3000';

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
      <Stack direction="row" justifyContent="center">
        <Button
          component="a"
          href={flowiseUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="contained"
          size="large"
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Create Workflow
        </Button>
      </Stack>
    </Box>
  );
}
