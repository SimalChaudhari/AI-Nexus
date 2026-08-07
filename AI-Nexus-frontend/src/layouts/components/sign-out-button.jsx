import { useCallback, useState } from 'react';

import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import { toast } from 'src/components/snackbar';

import { signOut } from 'src/auth/context/jwt/action';

// ----------------------------------------------------------------------

export function SignOutButton({ onClose, ...other }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // signOut hard-redirects to sign-in — do not race with refresh afterward.
      await signOut();
      onClose?.();
    } catch (error) {
      console.error(error);
      toast.error('Unable to logout!');
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, onClose]);

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
