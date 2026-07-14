import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { CORP } from 'src/sections/corporate/corporate-theme';
import { CorpAdminChip } from 'src/sections/corporate/corporate-ui';
import { useCorporateOverview } from 'src/sections/corporate/use-corporate-data';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  { title: 'Overview', path: paths.corporate.overview, icon: '⌁' },
  { title: 'Learner Progress', path: paths.corporate.progress, icon: '▦' },
  { title: 'Enrol Staff', path: paths.corporate.enrol, icon: '+' },
  { title: 'Reports & Certificates', path: paths.corporate.reports, icon: '⇩' },
];

const SIDEBAR_WIDTH = 285;

// ----------------------------------------------------------------------

function CorporateSidebarContent({ companyCode, onNavigate }) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!companyCode || companyCode === '—') return;
    try {
      await navigator.clipboard.writeText(companyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [companyCode]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: { xs: '20px 16px', md: '28px 22px' },
        overflowY: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: { xs: 2.5, md: 3.75 } }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${CORP.cyan}, ${CORP.blue}, ${CORP.mint})`,
            display: 'grid',
            placeItems: 'center',
            fontWeight: 900,
            boxShadow: '0 12px 30px rgba(22,184,255,.32)',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          AI
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>AI Nexus</Typography>
          <Typography sx={{ display: 'block', color: '#aec8ec', fontSize: 12, mt: 0.5 }}>
            Corporate Portal
          </Typography>
        </Box>
      </Box>

      <Typography
        sx={{
          fontSize: 11,
          color: '#9db9dc',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontWeight: 800,
          mx: 1.5,
          mb: 1.25,
          mt: { xs: 1, md: 3 },
        }}
      >
        Workspace
      </Typography>

      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.path ||
          (item.path === paths.corporate.overview && pathname === paths.corporate.root);

        return (
          <Box
            key={item.path}
            component={RouterLink}
            href={item.path}
            onClick={() => onNavigate?.()}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: '13px 14px',
              borderRadius: '15px',
              color: '#e6f0ff',
              textDecoration: 'none',
              fontWeight: 700,
              mb: '7px',
              bgcolor: active ? 'rgba(255,255,255,.12)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,.12)' },
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '10px',
                bgcolor: 'rgba(255,255,255,.13)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {item.icon}
            </Box>
            {item.title}
          </Box>
        );
      })}

      <Box
        sx={{
          mt: 'auto',
          pt: 3.5,
          border: '1px solid rgba(255,255,255,.16)',
          borderRadius: '22px',
          background: 'linear-gradient(135deg,rgba(22,184,255,.18),rgba(43,214,163,.14))',
          p: '18px',
        }}
      >
        <Typography sx={{ fontSize: 13, color: '#cfe2ff', m: '0 0 12px', lineHeight: 1.45 }}>
          Corporate reference ID for staff self-registration
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#fff',
            color: CORP.navy,
            borderRadius: '14px',
            p: '11px 12px',
            minWidth: 0,
          }}
        >
          <Typography
            component="strong"
            sx={{
              fontWeight: 800,
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {companyCode}
          </Typography>
          <Typography
            component="span"
            onClick={handleCopy}
            sx={{ color: CORP.blue, fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function CorporateLayout({ children }) {
  const pathname = usePathname();
  const { data } = useCorporateOverview();
  const companyCode = data?.companyCode || '—';
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarSx = {
    background: 'linear-gradient(180deg,#061833,#08234d 70%,#0a346a)',
    color: 'white',
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: `${SIDEBAR_WIDTH}px minmax(0,1fr)` },
        minHeight: '100vh',
        color: CORP.ink,
        background: `radial-gradient(circle at top left, rgba(22,184,255,.16), transparent 30%), ${CORP.bg}`,
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Desktop sidebar */}
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          ...sidebarSx,
        }}
      >
        <CorporateSidebarContent companyCode={companyCode} />
      </Box>

      {/* Mobile drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: Math.min(SIDEBAR_WIDTH, 320),
            boxSizing: 'border-box',
            ...sidebarSx,
          },
        }}
      >
        <CorporateSidebarContent
          companyCode={companyCode}
          onNavigate={() => setMobileOpen(false)}
        />
      </Drawer>

      <Box
        component="main"
        sx={{
          minWidth: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile top bar */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            py: 1,
            borderBottom: `1px solid ${CORP.line}`,
            bgcolor: 'rgba(255,255,255,.92)',
            backdropFilter: 'blur(8px)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            minWidth: 0,
          }}
        >
          <IconButton
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            sx={{ color: CORP.navy, flexShrink: 0 }}
          >
            <Iconify icon="mingcute:menu-line" width={22} />
          </IconButton>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: CORP.navy, lineHeight: 1.2 }}>
              AI Nexus
            </Typography>
            <Typography sx={{ fontSize: 11, color: CORP.muted }}>Corporate Portal</Typography>
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <CorpAdminChip compact />
          </Box>
        </Box>

        <Box sx={{ p: { xs: 1.75, sm: 2.25, md: '30px' }, minWidth: 0, flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
