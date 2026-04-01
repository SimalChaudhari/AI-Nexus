import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { EmailInboxIcon } from 'src/assets/icons';

import { Iconify } from 'src/components/iconify';

import { verifyEmail } from 'src/auth/context/jwt';

// ----------------------------------------------------------------------

export function SimpleVerifyView() {
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailFromUrl = searchParams.get('email');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const hasVerifiedRef = useRef(false);

  // After registration we redirect with ?email=... only (token is in the email link). Don't show error in that case.
  useEffect(() => {
    if (token && !hasVerifiedRef.current && !isVerifying && !isVerified) {
      hasVerifiedRef.current = true;
      handleVerify();
    } else if (!token && !emailFromUrl) {
      setErrorMsg('Invalid or missing verification token. Please check your email for the verification link.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, emailFromUrl]);

  const handleVerify = async () => {
    if (!token) {
      setErrorMsg('Invalid or missing verification token.');
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMsg('');
      setSuccessMsg('');
      const result = await verifyEmail({ token });
      setSuccessMsg(result.message || 'Email verified successfully! Redirecting to sign in...');
      setIsVerified(true);

      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        router.push(paths.auth.simple.signIn);
      }, 2000);
    } catch (error) {
      console.error(error);
      setErrorMsg(error && error.message ? error.message : 'Failed to verify email. Please try again.');
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderHead = (
    <>
      <EmailInboxIcon sx={{ mx: 'auto' }} />

      <Stack spacing={1} sx={{ mt: 3, mb: 5, textAlign: 'center', whiteSpace: 'pre-line' }}>
        <Typography variant="h5">Please check your email!</Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {isVerified
            ? 'Your email has been verified successfully!'
            : `We have sent a confirmation link to your email. \nPlease check your inbox or spam folder and click the verification link.`}
        </Typography>
      </Stack>
    </>
  );

  return (
    <>
      {renderHead}

      {!!errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {!!successMsg && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMsg}
        </Alert>
      )}

      {!isVerified && token && (
        <Stack spacing={2} sx={{ mt: 3 }}>
          <LoadingButton
            fullWidth
            size="large"
            variant="contained"
            loading={isVerifying}
            loadingIndicator="Verifying..."
            onClick={handleVerify}
          >
            Verify Email
          </LoadingButton>

          <Button
            component={RouterLink}
            href={paths.auth.simple.signIn}
            color="inherit"
            variant="outlined"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            sx={{ alignSelf: 'center' }}
          >
            Return to sign in
          </Button>
        </Stack>
      )}

      {isVerified && (
        <Button
          component={RouterLink}
          href={paths.auth.simple.signIn}
          color="inherit"
          variant="contained"
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          sx={{ alignSelf: 'center', mt: 3 }}
        >
          Go to sign in
        </Button>
      )}

      {!token && (
        <Button
          component={RouterLink}
          href={paths.auth.simple.signIn}
          color="inherit"
          variant="contained"
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          sx={{ alignSelf: 'center', mt: 3 }}
        >
          Return to sign in
        </Button>
      )}
    </>
  );
}

