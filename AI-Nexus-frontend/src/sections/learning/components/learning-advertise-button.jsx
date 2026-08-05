import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { appSettingsService } from 'src/services/app-settings.service';

// ----------------------------------------------------------------------

const NAVIGATE_PATH = 'https://iscacademy.sg/practical-ai-series/';
const BUTTON_LABEL = 'ISCAcademy Practical AI series';

/**
 * Fixed vertical promo tab on the right edge (vertically centered).
 * Name and link are managed from Admin → Settings → Learning Advertise Tab.
 */
export function LearningAdvertiseButton() {
  const theme = useTheme();
  const [tab, setTab] = useState({ name: DEFAULT_NAME, link: DEFAULT_LINK, ready: false });

  useEffect(() => {
    let cancelled = false;

    appSettingsService
      .getPublic()
      .then((settings) => {
        if (cancelled) return;
        const remote = settings?.learningAdvertiseTabContent;
        // Never configured → keep built-in defaults. Explicit empty name → hide tab.
        if (!remote) {
          setTab({ name: DEFAULT_NAME, link: DEFAULT_LINK, ready: true });
          return;
        }
        setTab({
          name: String(remote.name || '').trim(),
          link: String(remote.link || '').trim(),
          ready: true,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setTab({ name: DEFAULT_NAME, link: DEFAULT_LINK, ready: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const label = tab.name;
  const href = tab.link;

  if (!tab.ready || !label) {
    return null;
  }

  const handleClick = () => {
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      component="button"
      type="button"
      aria-label={label}
      onClick={handleClick}
      disabled={!href}
      sx={{
        position: 'fixed',
        right: 0,
        top: '50%',
        zIndex: theme.zIndex.speedDial,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        m: 0,
        px: 1,
        py: 1.75,
        border: 'none',
        cursor: href ? 'pointer' : 'default',
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        boxShadow: theme.customShadows?.z8 || theme.shadows[8],
        transition: theme.transitions.create(['background-color', 'padding-right'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': href
          ? {
              bgcolor: 'primary.dark',
              pr: 1.5,
            }
          : undefined,
        '&.Mui-disabled, &:disabled': {
          opacity: 1,
          color: 'primary.contrastText',
        },
      }}
    >
      <Iconify icon="solar:megaphone-bold-duotone" width={20} />
      <Box
        component="span"
        sx={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          typography: 'subtitle2',
          fontWeight: 700,
          letterSpacing: 1,
          lineHeight: 1.15,
          userSelect: 'none',
          maxHeight: '46vh',
        }}
      >
        {label}
      </Box>
    </Box>
  );
}
