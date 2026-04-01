import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

export function GradientButton({
  children,
  onClick,
  disabled = false,
  type = 'button',
  size = 'medium', // 'small', 'medium', 'large', or 'md' (maps to 'medium')
  fullWidth = false,
  icon,
  iconPosition = 'left', // 'left' or 'right'
  sx,
  ...other
}) {
  const theme = useTheme();

  // Map 'md' to 'medium' for backward compatibility
  const mappedSize = size === 'md' ? 'medium' : size;

  const sizeStyles = {
    small: {
      px: 3,
      py: 1,
      fontSize: '0.875rem',
    },
    medium: {
      px: 4,
      py: 1.5,
      fontSize: '1rem',
    },
    large: {
      px: 4,
      py: 1.8,
      fontSize: '1.125rem',
    },
  };

  const iconSize = {
    small: 16,
    medium: 18,
    large: 20,
  };

  const renderIcon = icon && typeof icon === 'string' ? (
    <Iconify
      icon={icon}
      width={iconSize[mappedSize]}
      sx={{ display: 'inline-flex' }}
    />
  ) : (
    icon
  );

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      fullWidth={fullWidth}
      variant="contained"
      className="AnimatedGradientBtn"
      startIcon={icon && iconPosition === 'left' ? renderIcon : undefined}
      endIcon={icon && iconPosition === 'right' ? renderIcon : undefined}
      sx={{
        fontWeight: 500,
        borderRadius: 1.25, // 5px equivalent
        whiteSpace: 'nowrap',
        background: 'linear-gradient(45deg, #56c7da, #fcd60b)',
        color: 'common.white',
        boxShadow: 'none',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': {
          color: '#ffffff',
          boxShadow: theme.customShadows.z8,
        },
        '&:active': {
          transform: 'translateY(0)',
        },
        '&:disabled': {
          opacity: 0.6,
          cursor: 'not-allowed',
          transform: 'none',
          background: 'linear-gradient(45deg, #56c7da, #fcd60b)',
          '&:hover': {
            background: 'linear-gradient(45deg, #56c7da, #fcd60b)',
          },
        },
        ...sizeStyles[mappedSize],
        ...sx,
      }}
      {...other}
    >
      {children}
    </Button>
  );
}

