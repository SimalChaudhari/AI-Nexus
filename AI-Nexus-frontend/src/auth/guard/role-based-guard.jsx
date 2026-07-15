import { useEffect } from 'react';
import { m } from 'framer-motion';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { ForbiddenIllustration } from 'src/assets/illustrations';

import { varBounce, MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

export function RoleBasedGuard({ sx, children, hasContent, currentRole, acceptRoles, redirectTo }) {
  const router = useRouter();
  const normalizedRole = String(currentRole || '').toLowerCase();
  const allowedRoles = Array.isArray(acceptRoles)
    ? acceptRoles.map((role) => String(role || '').toLowerCase())
    : undefined;
  const isAllowed = typeof allowedRoles === 'undefined' || allowedRoles.includes(normalizedRole);

  useEffect(() => {
    if (!isAllowed && redirectTo) {
      router.replace(redirectTo);
    }
  }, [isAllowed, redirectTo, router]);

  if (!isAllowed) {
    // If redirectTo is provided, don't show content (redirect will happen)
    if (redirectTo) {
      return null;
    }

    return hasContent ? (
      <Container component={MotionContainer} sx={{ textAlign: 'center', ...sx }}>
        <m.div variants={varBounce().in}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Permission denied
          </Typography>
        </m.div>

        <m.div variants={varBounce().in}>
          <Typography sx={{ color: 'text.secondary' }}>
            You do not have permission to access this page.
          </Typography>
        </m.div>

        <m.div variants={varBounce().in}>
          <ForbiddenIllustration sx={{ my: { xs: 5, sm: 10 } }} />
        </m.div>
      </Container>
    ) : null;
  }

  return <> {children} </>;
}
