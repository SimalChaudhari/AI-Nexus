import { useCallback, useState } from 'react';

import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';

import { useAuthContext } from 'src/auth/hooks';
import { signOut } from 'src/auth/context/jwt/action';

// ----------------------------------------------------------------------

export function SignOutButton({ onClose, ...other }) {
  const router = useRouter();

  const { checkUserSession } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
      await checkUserSession?.();

      onClose?.();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Unable to logout!');
    } finally {
      setIsLoggingOut(false);
    }
  }, [checkUserSession, isLoggingOut, onClose, router]);

  return (
    <Button
      fullWidth
      variant="soft"
      size="large"
      color="error"
      disabled={isLoggingOut}
      onClick={handleLogout}
      {...other}
    >
      {isLoggingOut ? (
        <>
          <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
          Logging out...
        </>
      ) : (
        'Logout'
      )}
    </Button>
  );
}
