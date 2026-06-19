import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { verifyFeeWaiverHrToken } from 'src/auth/context/jwt';

export function FeeWaiverHrVerifyView() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification link.');
      return;
    }

    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    verifyFeeWaiverHrToken({ token })
      .then((result) => {
        setStatus('success');
        setMessage(
          result?.message
            || `Thank you. ${result?.learnerName || 'The learner'}'s job role has been verified.`
        );
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error?.message || 'Could not complete verification. The link may have expired.');
      });
  }, [token]);

  return (
    <Stack spacing={3} alignItems="center" sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="h5">Job function verification</Typography>

      {status === 'loading' ? (
        <>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Verifying learner job role...
          </Typography>
        </>
      ) : null}

      {status === 'success' ? <Alert severity="success">{message}</Alert> : null}
      {status === 'error' ? <Alert severity="error">{message}</Alert> : null}
    </Stack>
  );
}
