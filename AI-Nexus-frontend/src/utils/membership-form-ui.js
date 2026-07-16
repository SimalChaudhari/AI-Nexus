import { alpha } from '@mui/material/styles';
import { inputLabelClasses } from '@mui/material/InputLabel';

// ----------------------------------------------------------------------

/** ISCA membership application defaults (Singapore). */
export const DEFAULT_MEMBERSHIP_COUNTRY = 'Singapore';
export const DEFAULT_MEMBERSHIP_DIAL_CODE = '65';

/**
 * Select menu: page does not shift; long lists (e.g. country) scroll inside the dropdown.
 */
export const MEMBERSHIP_SELECT_MENU_PROPS = {
  disableScrollLock: true,
  PaperProps: {
    sx: { maxHeight: 320 },
  },
  MenuListProps: {
    sx: {
      maxHeight: 300,
      overflowY: 'auto',
    },
  },
};

/** Outlined labels above inputs; required asterisk uses primary. */
export const INPUT_LABEL_ABOVE = {
  shrink: true,
  sx: {
    [`& .${inputLabelClasses.asterisk}`]: {
      color: 'primary.main',
    },
  },
};

export function getMembershipFormPaperSx(theme) {
  const { primary, secondary } = theme.palette;
  return {
    p: { xs: 2.5, md: 3.5 },
    pt: { xs: 3, md: 3.75 },
    borderRadius: 2.5,
    bgcolor: 'background.paper',
    border: `1px solid ${alpha(primary.main, 0.14)}`,
    boxShadow: `0 12px 40px ${alpha(primary.main, 0.1)}`,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      background: `linear-gradient(90deg, ${primary.main} 0%, ${secondary.main} 100%)`,
    },
  };
}

export function getMembershipFormTabsSx(theme, fullPage) {
  const { primary, secondary } = theme.palette;
  if (!fullPage) {
    return { borderBottom: 1, borderColor: 'divider' };
  }
  return {
    px: { xs: 1, md: 2 },
    bgcolor: alpha(primary.main, 0.04),
    borderBottom: `1px solid ${alpha(primary.main, 0.12)}`,
    '& .MuiTab-root': {
      textTransform: 'none',
      fontWeight: 600,
      minHeight: 56,
      fontSize: { xs: '0.8rem', sm: '0.875rem' },
    },
    '& .MuiTab-root.Mui-selected': {
      color: primary.main,
      fontWeight: 700,
    },
    '& .MuiTabs-indicator': {
      height: 3,
      borderRadius: '3px 3px 0 0',
      background: `linear-gradient(90deg, ${primary.main} 0%, ${secondary.main} 100%)`,
    },
  };
}

export function getMembershipFormFooterSx(theme, fullPage) {
  const { primary } = theme.palette;
  if (!fullPage) {
    return {
      py: 2,
      borderTop: 1,
      borderColor: 'divider',
      bgcolor: 'background.paper',
    };
  }
  return {
    px: { xs: 2, md: 4 },
    py: 2.5,
    borderTop: `1px solid ${alpha(primary.main, 0.12)}`,
    bgcolor: 'background.paper',
    boxShadow: `0 -8px 24px ${alpha(primary.main, 0.06)}`,
  };
}

export function getMembershipFormSubmitButtonSx(theme) {
  const { primary } = theme.palette;
  return {
    textTransform: 'none',
    fontWeight: 700,
    minWidth: { sm: 200 },
    px: 4,
    boxShadow: `0 6px 20px ${alpha(primary.main, 0.35)}`,
    '&:hover': {
      boxShadow: `0 8px 24px ${alpha(primary.main, 0.45)}`,
    },
  };
}

export function getMembershipQualificationTableSx(theme) {
  const { primary, secondary } = theme.palette;
  return {
    border: `1px solid ${alpha(primary.main, 0.14)}`,
    borderRadius: 2,
    mb: 3,
    overflow: 'hidden',
    bgcolor: 'background.paper',
    boxShadow: `0 4px 20px ${alpha(primary.main, 0.06)}`,
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      background: `linear-gradient(90deg, ${primary.main} 0%, ${secondary.main} 100%)`,
    },
  };
}
