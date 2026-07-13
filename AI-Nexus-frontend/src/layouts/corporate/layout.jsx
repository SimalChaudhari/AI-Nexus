import { useCallback, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { CORP } from 'src/sections/corporate/corporate-theme';
import { useCorporateOverview } from 'src/sections/corporate/use-corporate-data';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  { title: 'Overview', path: paths.corporate.overview, icon: '⌁' },
  { title: 'Learner Progress', path: paths.corporate.progress, icon: '▦' },
  { title: 'Enrol Staff', path: paths.corporate.enrol, icon: '+' },
  { title: 'Reports & Certificates', path: paths.corporate.reports, icon: '⇩' },
];

// ----------------------------------------------------------------------

function CorporateSidebar() {
  const pathname = usePathname();
  const { data } = useCorporateOverview();
  const companyCode = data?.companyCode || '—';
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
      component="aside"
      sx={{
        background: 'linear-gradient(180deg,#061833,#08234d 70%,#0a346a)',
        color: 'white',
        p: '28px 22px',
        position: { xs: 'relative', md: 'sticky' },
        top: 0,
        height: { xs: 'auto', md: '100vh' },
        overflowY: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 3.75 }}>
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
          }}
        >
          AI
        </Box>
        <Box>
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
          mt: 3,
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
          mt: 3.5,
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
            bgcolor: '#fff',
            color: CORP.navy,
            borderRadius: '14px',
            p: '11px 12px',
          }}
        >
          <Typography component="strong" sx={{ fontWeight: 800, fontSize: 14 }}>
            {companyCode}
          </Typography>
          <Typography
            component="span"
            onClick={handleCopy}
            sx={{ color: CORP.blue, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
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
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '285px minmax(0,1fr)' },
        minHeight: '100vh',
        color: CORP.ink,
        background: `radial-gradient(circle at top left, rgba(22,184,255,.16), transparent 30%), ${CORP.bg}`,
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <CorporateSidebar />
      <Box component="main" sx={{ p: { xs: 2, md: '30px' }, minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
