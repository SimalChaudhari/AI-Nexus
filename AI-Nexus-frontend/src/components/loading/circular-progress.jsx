import MuiCircularProgress from '@mui/material/CircularProgress';

/**
 * Shared CircularProgress wrapper (single source of truth).
 * We keep the API identical to MUI so existing usages continue to work.
 */
export default function CircularProgress(props) {
  return <MuiCircularProgress {...props} />;
}

