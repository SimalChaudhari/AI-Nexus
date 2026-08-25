import { useCallback, useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { toast } from 'src/components/snackbar';
import { courseService } from 'src/services/course.service';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export function UserCertificatesPanel({ userId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const loadCertificates = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const result = await courseService.getAdminCertificates({
        userId,
        limit: 100,
        page: 1,
      });
      setRows(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load certificates');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const handleDownload = async (row) => {
    if (!row?.id || row.certificateBlocked) return;
    setDownloadingId(row.id);
    try {
      const blob = await courseService.downloadAdminCertificatePdf(row.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate-${row.certificateNo || row.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.message || 'Failed to download certificate');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Card sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Certificates
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Download any certificate issued to this learner.
            </Typography>
          </Box>
          <Button
            size="small"
            color="inherit"
            variant="outlined"
            startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
            onClick={loadCertificates}
          >
            Refresh
          </Button>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {rows.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Iconify
              icon="solar:diploma-verified-bold"
              width={48}
              sx={{ color: 'text.disabled', mb: 1.5 }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              No certificates yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Certificates appear here after the learner completes eligible courses or programmes.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Certificate no</TableCell>
                  <TableCell>Course / programme</TableCell>
                  <TableCell>Completed</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">PDF</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const blocked = Boolean(row.certificateBlocked);
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.certificateNo || '—'}</TableCell>
                      <TableCell>{row.courseTitle || '—'}</TableCell>
                      <TableCell>{formatDate(row.completedAt)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="soft"
                          color={blocked ? 'error' : 'success'}
                          label={blocked ? 'Blocked' : 'Active'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <LoadingButton
                          size="small"
                          variant="outlined"
                          loading={downloadingId === row.id}
                          disabled={blocked}
                          startIcon={<Iconify icon="solar:download-bold" width={16} />}
                          onClick={() => handleDownload(row)}
                        >
                          Download
                        </LoadingButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Card>
  );
}
