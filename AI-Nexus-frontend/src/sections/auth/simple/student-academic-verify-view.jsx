import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { verifyStudentAcademicEmailToken } from 'src/auth/context/jwt';
import { paths } from 'src/routes/paths';
import { resumeStudentAcademicVerificationInSingleTab } from 'src/utils/membership-eligibility-sso';

const HANDOFF_MESSAGE =
  'Verification complete. Return to your registration tab to continue. You can close this tab.';

export function StudentAcademicVerifyView() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [resumeToken, setResumeToken] = useState('');
  const hasVerifiedRef = useRef(false);
  const resumeInProgressRef = useRef(false);

  const continueRegistration = async (nextResumeToken = '') => {
    const trimmedToken = String(nextResumeToken || resumeToken || '').trim();
    if (!trimmedToken || resumeInProgressRef.current) return;

    resumeInProgressRef.current = true;

    try {
      const outcome = await resumeStudentAcademicVerificationInSingleTab(paths.home, trimmedToken);
      if (outcome === 'handoff') {
        setStatus('handoff');
        setMessage(HANDOFF_MESSAGE);
        return;
      }
      if (outcome === 'error') {
        setStatus('error');
        setMessage('Verification succeeded but could not resume registration. Please click the email link again.');
      }
    } finally {
      resumeInProgressRef.current = false;
    }
  };

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification link.');
      return;
    }

    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    verifyStudentAcademicEmailToken({ token })
      .then((result) => {
        const nextResumeToken = String(result?.resumeToken || '').trim();
        setResumeToken(nextResumeToken);
        setStatus('success');
        setMessage(
          result?.message
            || `Thank you. ${result?.learnerName || 'Your'} student status has been verified.`
        );

        if (!nextResumeToken) {
          setStatus('error');
          setMessage('Verification succeeded but could not resume registration. Please click the email link again.');
          return;
        }

        window.setTimeout(() => {
          void continueRegistration(nextResumeToken);
        }, 1200);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error?.message || 'Could not complete verification. The link may have expired.');
      });
  }, [token]);

  return (
    <Stack spacing={3} alignItems="center" sx={{ py: 4, textAlign: 'center', px: 2 }}>
      <Typography variant="h5">Student verification</Typography>

      {status === 'loading' ? (
        <>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Verifying student status...
          </Typography>
        </>
      ) : null}

      {status === 'success' ? (
        <>
          <Alert severity="success">{message}</Alert>
          <Typography variant="body2" color="text.secondary">
            Continuing registration...
          </Typography>
        </>
      ) : null}

      {status === 'handoff' ? (
        <>
          <Alert severity="success">{message}</Alert>
          <Button variant="outlined" onClick={() => window.close()}>
            Close this tab
          </Button>
        </>
      ) : null}

      {status === 'error' ? (
        <>
          <Alert severity="error">{message}</Alert>
          {resumeToken ? (
            <Button variant="contained" onClick={() => continueRegistration(resumeToken)}>
              Try again
            </Button>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
