'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { useIntlAuth } from 'src/auth/intl-auth-context';
import { getIntlUser, isIntlAuthenticated } from 'src/auth/intl-session';
import { intlMe } from 'src/services/intl-auth.service';
import { getIntlMyPayments } from 'src/services/intl-payment.service';
import { notifyNavigationStart } from 'src/components/navigation-progress';
import { DashboardContent } from 'src/layouts/dashboard';
import { layoutClasses } from 'src/layouts/classes';
import { frontendContentSx } from 'src/layouts/main/frontend-content-layout';
import { HOME_DASHBOARD_CONTENT_SX } from 'src/sections/home/home-section-styles';
import { INTL_NAVY, INTL_NAVY_DEEP, INTL_RED, INTL_SOFT_BG } from 'src/theme/intl-brand';
import { IntlFooter } from '../intl-footer';
import { INTL_REGIONS } from '../intl-region';

// ----------------------------------------------------------------------

const NAVY = INTL_NAVY;
const NAVY_DEEP = INTL_NAVY_DEEP;
const RED = INTL_RED;
const TEAL = '#0f766e';
const PAGE_BG = INTL_SOFT_BG;
const CARD_RADIUS = '14px';

function displayNameOf(user) {
  if (!user) return 'User';
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.username || user.email?.split('@')[0] || 'User';
}

function initialsOf(user) {
  const name = displayNameOf(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(value, withTime = true) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function formatMoney(amount, currency) {
  if (amount == null || amount === '' || Number.isNaN(Number(amount))) return '—';
  const n = Number(amount);
  const code = String(currency || '').trim().toUpperCase();
  try {
    if (code) {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 2,
      }).format(n);
    }
  } catch {
    // fall through
  }
  return code ? `${code} ${n.toFixed(2)}` : n.toFixed(2);
}

function titleCaseStatus(value) {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid' || s === 'active') {
    return { color: TEAL, bg: alpha(TEAL, 0.12), border: alpha(TEAL, 0.28) };
  }
  if (s === 'pending' || s === 'pending_payment' || s === 'unpaid') {
    return { color: '#b45309', bg: alpha('#b45309', 0.1), border: alpha('#b45309', 0.28) };
  }
  if (s === 'failed' || s === 'canceled' || s === 'banned') {
    return { color: RED, bg: alpha(RED, 0.08), border: alpha(RED, 0.28) };
  }
  return { color: NAVY, bg: alpha(NAVY, 0.06), border: alpha(NAVY, 0.16) };
}

function StatusPill({ status }) {
  if (!status) return null;
  const tone = statusTone(status);
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.1,
        py: 0.35,
        borderRadius: 999,
        bgcolor: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
        fontWeight: 700,
        fontSize: 11.5,
        letterSpacing: '0.02em',
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: tone.color,
          flexShrink: 0,
        }}
      />
      {titleCaseStatus(status)}
    </Box>
  );
}

function ContactRow({ icon, children }) {
  if (!children) return null;
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ width: '100%' }}>
      <Iconify icon={icon} width={16} sx={{ color: alpha(NAVY, 0.45), mt: '2px', flexShrink: 0 }} />
      <Typography
        sx={{
          fontSize: 13.5,
          color: alpha(NAVY, 0.78),
          lineHeight: 1.45,
          wordBreak: 'break-word',
        }}
      >
        {children}
      </Typography>
    </Stack>
  );
}

function MetaPair({ label, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: alpha('#fff', 0.45),
          mb: 0.35,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          lineHeight: 1.35,
          wordBreak: 'break-word',
        }}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}

function UserProfileCard({ user, onLogout }) {
  const displayName = displayNameOf(user);
  const fullName = [user.salutation, user.firstName, user.lastName].filter(Boolean).join(' ');
  const jobFunction =
    user.jobFunction === 'Other' && user.jobFunctionOther
      ? user.jobFunctionOther
      : user.jobFunction;
  const phone = user.contactNumber || user.phone;
  const country = user.countryOfResidence || user.country;

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: CARD_RADIUS,
        border: `1px solid ${alpha(NAVY, 0.1)}`,
        boxShadow: `0 10px 28px ${alpha(NAVY, 0.06)}`,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          bgcolor: NAVY,
          color: '#fff',
          px: 2.5,
          py: 1.5,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.02em',
          flexShrink: 0,
        }}
      >
        User Profile
      </Box>

      <Stack
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2.5, pt: 3, pb: 2.5, flex: 1, height: '100%' }}
      >
        <Avatar
          src={user.avatarUrl || undefined}
          alt={displayName}
          sx={{
            width: 96,
            height: 96,
            fontSize: 32,
            fontWeight: 800,
            bgcolor: alpha(NAVY, 0.1),
            color: NAVY,
            border: `3px solid ${alpha(NAVY, 0.08)}`,
            boxShadow: `0 8px 20px ${alpha(NAVY, 0.12)}`,
          }}
        >
          {initialsOf(user)}
        </Avatar>

        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 18,
              color: NAVY,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            {fullName || displayName}
          </Typography>
          {jobFunction ? (
            <Typography sx={{ mt: 0.6, fontSize: 13.5, color: alpha(NAVY, 0.6), fontWeight: 500 }}>
              {jobFunction}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
            <StatusPill status={user.paymentStatus} />
            <StatusPill status={user.status} />
          </Stack>
        </Box>

        <Stack spacing={1.25} sx={{ width: '100%', pt: 1, flex: 1 }}>
          <ContactRow icon="solar:letter-bold-duotone">{user.email}</ContactRow>
          <ContactRow icon="solar:phone-bold-duotone">{phone}</ContactRow>
          <ContactRow icon="solar:global-bold-duotone">{country}</ContactRow>
          <ContactRow icon="solar:buildings-2-bold-duotone">{user.company}</ContactRow>
          <ContactRow icon="solar:user-bold-duotone">
            {user.username ? `@${user.username}` : null}
          </ContactRow>
          <ContactRow icon="solar:dollar-minimalistic-bold-duotone">{user.currency}</ContactRow>
          <ContactRow icon="solar:medal-ribbons-star-bold-duotone">
            {user.yearsOfExperience != null ? `${user.yearsOfExperience} years experience` : null}
          </ContactRow>
        </Stack>

        <Box
          sx={{
            width: '100%',
            mt: 1,
            pt: 2,
            borderTop: `1px solid ${alpha(NAVY, 0.08)}`,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.25,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: alpha(NAVY, 0.45), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Country code
            </Typography>
            <Typography sx={{ mt: 0.35, fontSize: 14, fontWeight: 700, color: NAVY }}>
              {user.countryCode || '—'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: alpha(NAVY, 0.45), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Member since
            </Typography>
            <Typography sx={{ mt: 0.35, fontSize: 14, fontWeight: 700, color: NAVY }}>
              {formatDate(user.createdAt, false)}
            </Typography>
          </Box>
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={onLogout}
          startIcon={<Iconify icon="solar:logout-2-bold-duotone" width={18} />}
          sx={{
            mt: 'auto',
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '10px',
            bgcolor: alpha(NAVY, 0.08),
            color: NAVY,
            boxShadow: 'none',
            py: 1.1,
            '&:hover': { bgcolor: alpha(NAVY, 0.14), boxShadow: 'none' },
          }}
        >
          Logout
        </Button>
      </Stack>
    </Box>
  );
}

function PaymentMethodCard({ payment, user, loading = false }) {
  const paid = String(payment?.status || user.paymentStatus || '').toLowerCase() === 'paid';
  const amountLabel = payment
    ? formatMoney(payment.amount, payment.currency)
    : loading
      ? 'Loading…'
      : user.currency
        ? `${user.currency} —`
        : '—';
  const planRaw = String(
    payment?.membershipType ||
      payment?.items?.[0]?.membershipType ||
      user.membershipType ||
      '',
  )
    .trim()
    .toLowerCase();
  const planLabel =
    planRaw === 'student' ? 'Student' : planRaw === 'full' ? 'Full / Role' : loading ? '…' : '—';

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 55%, #0a3a7a 100%)`,
        color: '#fff',
        p: { xs: 2, sm: 2.5 },
        boxShadow: `0 12px 28px ${alpha(NAVY, 0.22)}`,
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.75} alignItems="center">
          <Box
            sx={{
              width: 56,
              height: 40,
              borderRadius: '8px',
              background: `linear-gradient(145deg, ${alpha('#5eead4', 0.35)} 0%, ${alpha('#fff', 0.12)} 100%)`,
              border: `1px solid ${alpha('#fff', 0.18)}`,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Iconify icon="solar:card-bold-duotone" width={24} sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.01em' }}>
              Membership payment
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: 12.5, color: alpha('#fff', 0.65) }}>
              AI Nexus International · WooshPay
            </Typography>
          </Box>
        </Stack>
        <StatusPill status={payment?.status || user.paymentStatus} />
      </Stack>

      <Typography
        sx={{
          fontWeight: 800,
          fontSize: { xs: 28, sm: 32 },
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          mb: 2,
        }}
      >
        {amountLabel}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' },
          gap: 1.75,
        }}
      >
        <MetaPair label="Currency" value={payment?.currency || user.currency} />
        <MetaPair label="Membership plan" value={planLabel} />
        <MetaPair
          label="Payment method"
          value={
            payment?.paymentMethod
              || (paid ? 'Online payment' : loading ? '…' : '—')
          }
        />
        <MetaPair
          label="Reference"
          value={payment?.refId ? String(payment.refId) : loading ? '…' : '—'}
        />
        <MetaPair
          label={paid ? 'Paid at' : 'Created'}
          value={
            payment?.paidAt || payment?.createdAt
              ? formatDate(payment?.paidAt || payment?.createdAt, false)
              : loading
                ? '…'
                : '—'
          }
        />
        <MetaPair
          label="Billing country"
          value={payment?.countryOfResidence || user.countryOfResidence}
        />
        <MetaPair
          label="GST"
          value={
            payment?.applyGst
              ? formatMoney(payment.gstAmount, payment.currency)
              : payment
                ? 'Not applied'
                : loading
                  ? '…'
                  : '—'
          }
        />
        <MetaPair
          label="Promo"
          value={
            payment?.promoApplied
              ? payment.promoCode || 'Applied'
              : payment?.promoCode || user.promoCode || (payment ? 'None' : loading ? '…' : '—')
          }
        />
        <MetaPair
          label="WooshPay session"
          value={payment?.wooshpaySessionId || (loading ? '…' : '—')}
        />
        <MetaPair
          label="WooshPay intent"
          value={payment?.wooshpayPaymentIntentId || (loading ? '…' : '—')}
        />
      </Box>
    </Box>
  );
}

function QuickLinks({ active = 'dashboard' }) {
  const items = [
    { key: 'dashboard', label: 'Learning Dashboard', href: paths.dashboard, icon: 'solar:widget-bold-duotone' },
    { key: 'home', label: 'International Home', href: paths.international, icon: 'solar:global-bold-duotone' },
  ];

  return (
    <Box sx={{ alignSelf: 'start', width: '100%', py: 0.5 }}>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: alpha(NAVY, 0.55),
          mb: 1.5,
          px: 0.5,
        }}
      >
        Quick Links
      </Typography>

      <Stack spacing={0.5}>
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Box
              key={item.key}
              component={Link}
              href={item.href}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1.15,
                borderRadius: '10px',
                textDecoration: 'none',
                color: NAVY,
                bgcolor: isActive ? alpha(NAVY, 0.06) : 'transparent',
                borderLeft: isActive ? `3px solid ${NAVY}` : '3px solid transparent',
                fontWeight: isActive ? 700 : 550,
                fontSize: 14,
                transition: 'background-color .15s',
                '&:hover': { bgcolor: alpha(NAVY, 0.05) },
              }}
            >
              <Iconify icon={item.icon} width={18} sx={{ color: isActive ? NAVY : alpha(NAVY, 0.55) }} />
              {item.label}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

export function IntlProfileView() {
  const router = useRouter();
  const { user: authUser, ready: authReady, signOut } = useIntlAuth();
  const [user, setUser] = useState(() => authUser || getIntlUser());
  const [payment, setPayment] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(() => !authUser && !getIntlUser());
  const [paymentLoading, setPaymentLoading] = useState(true);

  useLayoutEffect(() => {
    if (!authReady) return;
    if (!isIntlAuthenticated() && !authUser) {
      router.replace(paths.auth.signIn);
      return;
    }
    const cached = authUser || getIntlUser();
    if (cached) {
      setUser(cached);
      setLoading(false);
    }
  }, [authReady, authUser, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authReady) return;
      if (!isIntlAuthenticated()) return;
      const cached = authUser || getIntlUser();
      setPaymentLoading(true);
      try {
        // Load payments first (heals plan), then refresh profile user.
        const pay = await getIntlMyPayments();
        if (!active) return;
        setPayment(pay?.latest || null);
        setPayments(Array.isArray(pay?.payments) ? pay.payments : []);

        const fresh = await intlMe().catch(() => null);
        if (!active) return;
        if (fresh) setUser(fresh);
      } catch {
        if (!active) return;
        // Keep cached user; surface empty billing only if fetch failed.
        if (!cached) router.replace(paths.auth.signIn);
      } finally {
        if (active) {
          setLoading(false);
          setPaymentLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
    // Only re-fetch when auth readiness / user identity changes (not every user object refresh).
  }, [authReady, authUser?.id, router]);

  const handleLogout = () => {
    notifyNavigationStart();
    signOut();
    router.push(paths.auth.signIn);
  };

  if ((loading || !authReady) && !user) {
    return (
      <Box
        sx={{
          width: '100%',
          minHeight: 'calc(100dvh - 64px)',
          display: 'grid',
          placeItems: 'center',
          bgcolor: PAGE_BG,
          px: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: '#fff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 24px rgba(0, 32, 96, 0.12)',
            }}
          >
            <CircularProgress size={26} thickness={4} sx={{ color: NAVY }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: alpha(NAVY, 0.7) }}>
            Loading profile…
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box
        sx={{
          width: '100%',
          minHeight: 'calc(100dvh - 64px)',
          display: 'grid',
          placeItems: 'center',
          bgcolor: PAGE_BG,
        }}
      >
        <CircularProgress size={26} thickness={4} sx={{ color: NAVY }} />
      </Box>
    );
  }

  const historyItems = payments.length ? payments : payment ? [payment] : [];

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        minHeight: '100%',
        bgcolor: PAGE_BG,
        color: NAVY,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        // Same content containment as landing page (footer aligns inside)
        '--layout-dashboard-content-px': {
          xs: '16px',
          sm: '24px',
          md: '32px',
          lg: '48px',
          xl: '64px',
        },
        [`& .${layoutClasses.content}`]: frontendContentSx,
      }}
    >
      {/* Same style page hero as Learning dashboard */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderBottom: `1px solid ${alpha(NAVY, 0.08)}`,
          background: `
            radial-gradient(ellipse 70% 80% at 100% 0%, ${alpha(NAVY, 0.08)} 0%, transparent 55%),
            linear-gradient(180deg, #ffffff 0%, ${PAGE_BG} 100%)
          `,
        }}
      >
        <DashboardContent sx={{ ...HOME_DASHBOARD_CONTENT_SX, pt: { xs: 2.5, md: 3.5 }, pb: { xs: 3, md: 4 } }}>
          <Box sx={{ maxWidth: 640 }}>
            <Typography
              sx={{
                mb: 1.25,
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.25,
                py: 0.4,
                borderRadius: 1,
                bgcolor: alpha(NAVY, 0.06),
                color: NAVY,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              My account
            </Typography>

            <Typography
              component="h1"
              sx={{
                m: 0,
                fontWeight: 800,
                fontSize: { xs: 30, sm: 36, md: 42 },
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: NAVY,
              }}
            >
              Profile
            </Typography>

            <Typography
              sx={{
                mt: 1.5,
                m: 0,
                color: alpha(NAVY, 0.72),
                fontSize: { xs: 15, md: 16 },
                lineHeight: 1.6,
              }}
            >
              Manage your details, billing history, and membership for AI Fluency.
            </Typography>
          </Box>
        </DashboardContent>
      </Box>

      <DashboardContent sx={{ ...HOME_DASHBOARD_CONTENT_SX, py: { xs: 2.5, md: 3.5 }, flex: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '360px minmax(0, 1fr)',
              lg: '360px minmax(0, 1fr) 260px',
            },
            gap: { xs: 2, md: 2.5 },
            alignItems: 'stretch',
          }}
        >
          {/* Left — User profile (main details) */}
          <Box sx={{ height: { md: '100%' }, minHeight: 0 }}>
            <UserProfileCard user={user} onLogout={handleLogout} />
          </Box>

          {/* Center — Payment details */}
          <Box
            id="billing"
            sx={{
              minWidth: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
              sx={{ mb: 2, flexShrink: 0 }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: { xs: 22, sm: 24 }, color: NAVY, letterSpacing: '-0.02em' }}>
                Payment Details
              </Typography>
              {!String(user.paymentStatus || '').toLowerCase().includes('paid') ? (
                <Button
                  component={Link}
                  href={paths.auth.signUp}
                  variant="contained"
                  startIcon={<Iconify icon="solar:card-send-bold-duotone" width={18} />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '10px',
                    bgcolor: NAVY,
                    boxShadow: 'none',
                    px: 2,
                    '&:hover': { bgcolor: NAVY_DEEP, boxShadow: 'none' },
                  }}
                >
                  Complete payment
                </Button>
              ) : null}
            </Stack>

            <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
              <PaymentMethodCard payment={payment} user={user} loading={paymentLoading} />

              <Box
                id="history"
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: '#fff',
                  borderRadius: '12px',
                  border: `1px solid ${alpha(NAVY, 0.1)}`,
                  boxShadow: `0 4px 14px ${alpha(NAVY, 0.04)}`,
                  p: 2,
                  minHeight: 0,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 16,
                    color: NAVY,
                    mb: 1.25,
                  }}
                >
                  Billing History
                </Typography>

                {historyItems.length ? (
                  <Stack spacing={1.25} sx={{ flex: 1 }}>
                    {historyItems.map((item, index) => (
                      <Box
                        key={item.id || item.refId || index}
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          justifyContent: 'space-between',
                          gap: 1.25,
                          p: 1.75,
                          borderRadius: '10px',
                          bgcolor: alpha(NAVY, 0.03),
                          border: `1px solid ${alpha(NAVY, 0.08)}`,
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 42,
                              height: 42,
                              borderRadius: '10px',
                              bgcolor: alpha(NAVY, 0.06),
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Iconify icon="solar:bill-list-bold-duotone" width={20} sx={{ color: NAVY }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: NAVY }}>
                              {formatMoney(item.amount, item.currency)}
                            </Typography>
                            <Typography sx={{ fontSize: 12.5, color: alpha(NAVY, 0.55), mt: 0.2 }}>
                              {item.refId || 'Membership'} · {formatDate(item.paidAt || item.createdAt)}
                              {item.paymentMethod ? ` · ${item.paymentMethod}` : ''}
                            </Typography>
                            {item.wooshpaySessionId ? (
                              <Typography
                                sx={{
                                  fontSize: 11.5,
                                  color: alpha(NAVY, 0.45),
                                  mt: 0.35,
                                  wordBreak: 'break-all',
                                }}
                              >
                                Session: {item.wooshpaySessionId}
                              </Typography>
                            ) : null}
                            {item.wooshpayPaymentIntentId ? (
                              <Typography
                                sx={{
                                  fontSize: 11.5,
                                  color: alpha(NAVY, 0.45),
                                  wordBreak: 'break-all',
                                }}
                              >
                                Intent: {item.wooshpayPaymentIntentId}
                              </Typography>
                            ) : null}
                          </Box>
                        </Stack>
                        <StatusPill status={item.status} />
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'grid',
                      placeItems: 'center',
                      p: 2.5,
                      borderRadius: '10px',
                      bgcolor: alpha(NAVY, 0.02),
                      border: `1px dashed ${alpha(NAVY, 0.2)}`,
                      color: alpha(NAVY, 0.6),
                      fontSize: 14,
                      textAlign: 'center',
                    }}
                  >
                    No billing history yet.
                  </Box>
                )}
              </Box>
            </Stack>
          </Box>

          {/* Right — Quick links (desktop) — top-aligned compact card like original */}
          <Box
            sx={{
              display: { xs: 'none', lg: 'block' },
              alignSelf: 'start',
              position: 'sticky',
              top: 88,
            }}
          >
            <QuickLinks active="profile" />
          </Box>

          {/* Quick links under content on smaller screens */}
          <Box sx={{ display: { xs: 'block', lg: 'none' }, gridColumn: '1 / -1' }}>
            <QuickLinks active="profile" />
          </Box>
        </Box>
      </DashboardContent>

      {/* Same contained footer as landing page */}
      <IntlFooter regions={INTL_REGIONS} />
    </Box>
  );
}
