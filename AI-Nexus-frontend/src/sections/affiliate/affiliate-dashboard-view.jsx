import { useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useSearchParams } from 'src/routes/hooks';

import { getAffiliateDashboard } from 'src/services/affiliate.service';

// ----------------------------------------------------------------------

export function AffiliateDashboardView() {
  const searchParams = useSearchParams();
  const codeFromUrl = (searchParams.get('code') || searchParams.get('ref') || '').trim().toUpperCase();

  const [code, setCode] = useState(codeFromUrl);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [report, setReport] = useState(null);

  const loadReport = async (nextCode = code) => {
    const normalized = String(nextCode || '').trim().toUpperCase();
    if (!normalized) {
      setErrorMsg('Enter an affiliate code to view the report.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await getAffiliateDashboard(normalized);
      setReport(data);
    } catch (error) {
      setReport(null);
      setErrorMsg(error?.response?.data?.message || error?.message || 'Could not load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (codeFromUrl) {
      loadReport(codeFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto', py: 4, px: 2 }}>
      <Box>
        <Typography variant="h4">Affiliate dashboard</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Track clicks, signups and paid sales for an affiliate code.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          fullWidth
          label="Affiliate code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
        />
        <LoadingButton
          variant="contained"
          loading={loading}
          onClick={() => loadReport()}
          sx={{ minWidth: 140 }}
        >
          Load report
        </LoadingButton>
      </Stack>

      {!!errorMsg && <Alert severity="error">{errorMsg}</Alert>}

      {report && (
        <Stack spacing={2}>
          <Typography variant="h6">Code: {report.affiliateCode}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <StatCard label="Total clicks" value={report.totalClicks} />
            <StatCard label="Total signups" value={report.totalSignups} />
            <StatCard label="Paid sales" value={report.totalPaidSales} />
          </Stack>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Revenue
            </Typography>
            <Typography variant="h5">
              {report.currency} {Number(report.totalRevenue || 0).toFixed(2)}
            </Typography>
          </Card>

          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Recent paid sales
            </Typography>
            {!report.recentPaidSales?.length ? (
              <Typography variant="body2" color="text.secondary">
                No paid sales yet.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {report.recentPaidSales.map((sale) => (
                  <Box
                    key={sale.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: 'wrap',
                      py: 1,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Box>
                      <Typography variant="body2">
                        {sale.currency} {Number(sale.amount || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sale.voucherCode ? `Voucher: ${sale.voucherCode}` : 'No voucher'}
                        {sale.paymentRefId ? ` · Ref: ${sale.paymentRefId}` : ''}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {sale.paidAt ? new Date(sale.paidAt).toLocaleString() : '—'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>

          <Button
            variant="outlined"
            href={`/signup?ref=${encodeURIComponent(report.affiliateCode)}`}
          >
            Open signup link for {report.affiliateCode}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

function StatCard({ label, value }) {
  return (
    <Card sx={{ p: 2.5, flex: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </Card>
  );
}
