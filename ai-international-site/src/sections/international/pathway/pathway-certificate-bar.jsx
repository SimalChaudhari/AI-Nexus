'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { intlPathwayProgressService } from 'src/services/intl-pathway-progress.service';
import { INTL_NAVY, INTL_NAVY_DEEP } from 'src/theme/intl-brand';
import { useIntlPathwayProgress } from './use-intl-pathway-progress';

export function PathwayCertificateBar({ moduleCodes = [] }) {
  const { progressByCode, certificates, refresh } = useIntlPathwayProgress();
  const [busy, setBusy] = useState(false);
  const required = Array.isArray(moduleCodes) ? moduleCodes.filter(Boolean) : [];
  const completedCount = required.filter((code) => progressByCode?.[code]?.isCompleted).length;
  const allDone = required.length > 0 && completedCount === required.length;
  const cert = certificates[0] || null;

  const issueOrDownload = async () => {
    setBusy(true);
    try {
      let row = cert;
      if (!row) {
        const issued = await intlPathwayProgressService.issueCertificate();
        if (issued?.id) row = issued;
        await refresh();
      }
      const id = row?.id || certificates[0]?.id;
      if (!id) return;
      const blob = await intlPathwayProgressService.downloadCertificatePdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row?.certificateNo || 'certificate'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  if (!required.length) return null;

  return (
    <Box
      sx={{
        mb: 2.5,
        p: 2,
        borderRadius: '12px',
        border: `1px solid ${alpha(INTL_NAVY, 0.12)}`,
        bgcolor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Box>
        <Typography sx={{ fontWeight: 800, color: INTL_NAVY, fontSize: 14 }}>
          {allDone ? 'Pathway complete' : 'Certificate unlocks when every module is complete'}
        </Typography>
        <Typography sx={{ color: alpha(INTL_NAVY, 0.65), fontSize: 13, mt: 0.25 }}>
          Unique watch coverage and required range match AI Nexus. {completedCount}/{required.length}{' '}
          modules complete. Rewatching does not inflate progress.
        </Typography>
      </Box>
      <Button
        variant="contained"
        disabled={!allDone || busy}
        onClick={issueOrDownload}
        startIcon={<Iconify icon="solar:diploma-bold-duotone" width={18} />}
        sx={{
          textTransform: 'none',
          fontWeight: 700,
          bgcolor: INTL_NAVY,
          '&:hover': { bgcolor: INTL_NAVY_DEEP },
        }}
      >
        {cert ? 'Download certificate' : 'Get certificate'}
      </Button>
    </Box>
  );
}
