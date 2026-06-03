import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export function DetailCommentSignInPrompt({
  message = 'Please sign in to join the conversation',
  signInHref = paths.auth.simple.signIn,
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: '16px',
        textAlign: 'center',
        border: `1px dashed ${alpha(theme.palette.primary.main, 0.28)}`,
        bgcolor: alpha(theme.palette.primary.main, 0.05),
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
          }}
        >
          <Iconify icon="solar:chat-round-dots-bold" width={26} />
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360 }}>
          {message}
        </Typography>
        <Button
          component={RouterLink}
          href={signInHref}
          variant="contained"
          size="small"
          startIcon={<Iconify icon="solar:login-2-bold" width={18} />}
          sx={{ '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inline-flex' } } }}
        >
          Sign in
        </Button>
      </Stack>
    </Box>
  );
}
