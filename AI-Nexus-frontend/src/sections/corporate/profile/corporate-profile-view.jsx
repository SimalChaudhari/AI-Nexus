import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { LoadingScreen } from 'src/components/loading-screen';

import { getCorporateProfile } from 'src/services/corporate.service';

import { CORP } from '../corporate-theme';
import { CorpBtn, CorpCard, CorpPageHeader } from '../corporate-ui';

// ----------------------------------------------------------------------

function DetailRow({ label, value }) {
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' },
        gap: { xs: 0.25, sm: 1.5 },
        py: 1.1,
        borderBottom: `1px solid ${CORP.line}`,
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: CORP.muted, letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: CORP.ink, wordBreak: 'break-word' }}>
        {text}
      </Typography>
    </Box>
  );
}

function Section({ title, children }) {
  return (
    <CorpCard sx={{ mb: 2 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 16, color: CORP.navy, mb: 1.25 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 0.5, borderColor: CORP.line }} />
      {children}
    </CorpCard>
  );
}

// ----------------------------------------------------------------------

export function CorporateProfileView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCorporateProfile();
      setData(result || null);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load profile');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen />;

  const sf = data?.salesforce || {};
  const local = data?.local || {};
  const fullName =
    [sf.contactFirstName, sf.contactLastName].filter(Boolean).join(' ').trim()
    || [local.firstname, local.lastname].filter(Boolean).join(' ').trim()
    || 'Corporate HR';

  return (
    <Box>
      <CorpPageHeader
        eyebrow="Account"
        title="Corporate profile"
        subtitle="Details synced from Salesforce corporate membership (userinfoforcorporate)."
        titleSx={{ fontSize: { xs: 24, md: 32 } }}
      />

      {error ? (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <CorpBtn variant="ghost" onClick={load}>
              Retry
            </CorpBtn>
          }
        >
          {error}
        </Alert>
      ) : null}

      <CorpCard sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${CORP.blue}, ${CORP.cyan})`,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            HR
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: CORP.navy }}>
              {fullName}
            </Typography>
            <Typography sx={{ color: CORP.muted, fontSize: 13 }}>
              {sf.contactEmail || local.email || '—'}
            </Typography>
            <Typography sx={{ color: CORP.muted, fontSize: 12, mt: 0.5 }}>
              Source: {data?.source === 'salesforce' ? 'Live Salesforce' : 'Last synced cache'}
              {data?.syncedAt
                ? ` · Synced ${new Date(data.syncedAt).toLocaleString()}`
                : ''}
            </Typography>
          </Box>
          <CorpBtn variant="ghost" onClick={load}>
            Refresh
          </CorpBtn>
        </Box>
      </CorpCard>

      <Section title="Contact">
        <DetailRow label="First name" value={sf.contactFirstName} />
        <DetailRow label="Last name" value={sf.contactLastName} />
        <DetailRow label="Email" value={sf.contactEmail} />
        <DetailRow label="Mobile" value={sf.contactMobile} />
        <DetailRow label="Phone" value={sf.contactPhone} />
        <DetailRow label="Designation" value={sf.contactDesignation} />
        <DetailRow label="Username" value={sf.username} />
        <DetailRow label="Contact ID" value={sf.contactId} />
      </Section>

      <Section title="Company">
        <DetailRow label="Account name" value={sf.accountName} />
        <DetailRow label="Company code" value={sf.companyCode} />
        <DetailRow label="UEN number" value={sf.uenNumber} />
        <DetailRow label="Organisation type" value={sf.organisationType} />
        <DetailRow label="Billing city" value={sf.billingCity} />
        <DetailRow label="Billing country" value={sf.billingCountry} />
        <DetailRow label="Account ID" value={sf.accountId} />
        <DetailRow
          label="Corporate member"
          value={
            sf.isCorporateMember === true || sf.isCorporateMember === 'true'
              ? 'Yes'
              : sf.isCorporateMember === false || sf.isCorporateMember === 'false'
                ? 'No'
                : sf.isCorporateMember
          }
        />
        <DetailRow label="Salesforce role" value={sf.role} />
      </Section>
    </Box>
  );
}
