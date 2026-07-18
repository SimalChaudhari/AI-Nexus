import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { TablePaginationCustom } from 'src/components/table';
import {
  deleteCorporateBulkEnrolmentZip,
  downloadCorporateBulkEnrolmentZip,
  getMyCorporateBulkEnrolmentUploads,
  uploadCorporateBulkEnrolmentZip,
} from 'src/services/corporate.service';

import { CORP } from '../corporate-theme';
import { useCorporateCompanyCode } from '../use-corporate-data';
import { CorpBtn, CorpCard, CorpPageHeader, CorpTableHead, corpTableSx } from '../corporate-ui';

// ----------------------------------------------------------------------

const MAX_FILES = 10;
const MAX_FILE_BYTES = 500 * 1024 * 1024;
const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function fileKey(file) {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

// ----------------------------------------------------------------------

export function CorporateBulkUploadsView() {
  const companyCode = useCorporateCompanyCode();
  const fileInputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadUploads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getMyCorporateBulkEnrolmentUploads({
        companyCode: companyCode || undefined,
        page: page + 1,
        limit: rowsPerPage,
      });
      const items = Array.isArray(result?.data) ? result.data : [];
      const total = Number(result?.pagination?.totalItems) || 0;
      setRows(items);
      setTotalItems(total);

      const maxPage = Math.max(0, Math.ceil(total / rowsPerPage) - 1);
      if (page > maxPage) {
        setPage(maxPage);
      }
    } catch (err) {
      setRows([]);
      setTotalItems(0);
      setError(err?.response?.data?.message || err?.message || 'Failed to load uploaded ZIP files');
    } finally {
      setLoading(false);
    }
  }, [companyCode, page, rowsPerPage]);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  const selectedTotalBytes = useMemo(
    () => selectedFiles.reduce((sum, file) => sum + (Number(file.size) || 0), 0),
    [selectedFiles],
  );

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePickFiles = (event) => {
    const picked = Array.from(event.target.files || []);
    resetFileInput();
    if (!picked.length) return;

    const zipFiles = picked.filter((file) => /\.zip$/i.test(file.name));
    if (zipFiles.length !== picked.length) {
      toast.error('Only .zip files are allowed');
    }

    const oversized = zipFiles.filter((file) => file.size > MAX_FILE_BYTES);
    if (oversized.length) {
      toast.error(`Each ZIP must be ${formatBytes(MAX_FILE_BYTES)} or smaller`);
    }

    const valid = zipFiles.filter((file) => file.size <= MAX_FILE_BYTES);
    if (!valid.length) return;

    setSelectedFiles((prev) => {
      const existing = new Set(prev.map(fileKey));
      const merged = [...prev];
      let skippedDupes = 0;

      valid.forEach((file) => {
        const key = fileKey(file);
        if (existing.has(key)) {
          skippedDupes += 1;
          return;
        }
        if (merged.length >= MAX_FILES) return;
        existing.add(key);
        merged.push(file);
      });

      if (merged.length >= MAX_FILES && prev.length + valid.length - skippedDupes > MAX_FILES) {
        toast.error(`You can select a maximum of ${MAX_FILES} ZIP files at once`);
      } else if (skippedDupes) {
        toast.info('Duplicate files were skipped');
      }

      return merged.slice(0, MAX_FILES);
    });
  };

  const handleRemoveSelected = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearSelected = () => {
    setSelectedFiles([]);
    resetFileInput();
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || uploading) return;

    if (selectedFiles.some((file) => !/\.zip$/i.test(file.name))) {
      toast.error('Only .zip files are allowed');
      return;
    }
    if (selectedFiles.some((file) => file.size > MAX_FILE_BYTES)) {
      toast.error(`Each ZIP must be ${formatBytes(MAX_FILE_BYTES)} or smaller`);
      return;
    }

    setUploading(true);
    try {
      await uploadCorporateBulkEnrolmentZip(selectedFiles, companyCode || undefined);
      toast.success(
        selectedFiles.length === 1
          ? 'ZIP uploaded successfully'
          : `${selectedFiles.length} ZIP files uploaded successfully`,
      );
      setSelectedFiles([]);
      resetFileInput();
      if (page !== 0) setPage(0);
      else await loadUploads();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to upload ZIP file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (row) => {
    if (!row?.id || downloadingId) return;
    setDownloadingId(row.id);
    try {
      await downloadCorporateBulkEnrolmentZip(row.id, {
        fileName: row.originalFileName,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to download ZIP file');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id || deletingId) return;
    setDeletingId(row.id);
    try {
      await deleteCorporateBulkEnrolmentZip(row.id);
      toast.success('ZIP file deleted');
      if (rows.length === 1 && page > 0) {
        setPage((prev) => Math.max(0, prev - 1));
      } else {
        await loadUploads();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete ZIP file');
    } finally {
      setDeletingId(null);
    }
  };

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const from = totalItems === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min(totalItems, (page + 1) * rowsPerPage);

  return (
    <Box sx={{ width: '100%', minWidth: 0, overflowX: 'hidden' }}>
      <CorpPageHeader
        eyebrow="Bulk Enrolment"
        title="Your uploaded ZIP files"
        subtitle="Review every bulk enrolment ZIP you have uploaded. You can delete a file you uploaded by mistake."
        titleSx={{ fontSize: { xs: 22, sm: 26, md: 32 } }}
      />

      <Box sx={{ mb: 2, display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
        <CorpBtn variant="ghost" component={RouterLink} href={paths.corporate.enrol}>
          ← Back to Enrol Staff
        </CorpBtn>
        <CorpBtn
          variant={showUpload ? 'ghost' : 'blue'}
          onClick={() => setShowUpload((prev) => !prev)}
        >
          {showUpload ? 'Hide upload' : 'Upload ZIP files'}
        </CorpBtn>
        <CorpBtn variant="ghost" onClick={loadUploads} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </CorpBtn>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {showUpload ? (
      <CorpCard sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, color: CORP.navy, fontSize: { xs: 15, sm: 16 }, mb: 0.75 }}>
          Upload ZIP files
        </Typography>
        <Typography sx={{ color: CORP.muted, fontSize: 13, mb: 1.5 }}>
          Select one or more .zip files (max {MAX_FILES} at once, {formatBytes(MAX_FILE_BYTES)} each).
          You can remove files from the list before uploading.
        </Typography>

        <Box
          sx={{
            border: `1px dashed ${CORP.line}`,
            borderRadius: '16px',
            bgcolor: '#f8fbff',
            px: { xs: 1.5, sm: 2 },
            py: { xs: 2, sm: 2.25 },
            mb: 1.5,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontWeight: 700, color: CORP.navy, fontSize: 14, mb: 0.5 }}>
            Choose ZIP files
          </Typography>
          <Typography sx={{ color: CORP.muted, fontSize: 12.5, mb: 1.25 }}>
            .zip only · up to {formatBytes(MAX_FILE_BYTES)} per file · max {MAX_FILES} files
          </Typography>

          <Box
            component="input"
            ref={fileInputRef}
            type="file"
            multiple
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handlePickFiles}
            sx={{ display: 'none' }}
          />

          <CorpBtn
            variant="ghost"
            disabled={uploading || selectedFiles.length >= MAX_FILES}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFiles.length ? 'Add more ZIP files' : 'Browse ZIP files'}
          </CorpBtn>
        </Box>

        {selectedFiles.length ? (
          <Box sx={{ mb: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                mb: 1,
                flexWrap: 'wrap',
              }}
            >
              <Typography sx={{ fontSize: 13, color: CORP.ink, fontWeight: 700 }}>
                Selected ({selectedFiles.length}/{MAX_FILES}) · {formatBytes(selectedTotalBytes)}
              </Typography>
              <CorpBtn
                variant="ghost"
                sx={{ minWidth: 0, px: 1.25, py: 0.6, fontSize: 12.5 }}
                disabled={uploading}
                onClick={handleClearSelected}
              >
                Clear all
              </CorpBtn>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {selectedFiles.map((file, index) => (
                <Box
                  key={fileKey(file)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.25,
                    py: 1,
                    borderRadius: '12px',
                    border: `1px solid ${CORP.line}`,
                    bgcolor: 'white',
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '10px',
                      bgcolor: '#eef4ff',
                      color: CORP.navy,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon="solar:file-bold-duotone" width={18} />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: CORP.ink,
                        wordBreak: 'break-word',
                      }}
                    >
                      {file.name}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: CORP.muted }}>
                      {formatBytes(file.size)}
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    disabled={uploading}
                    onClick={() => handleRemoveSelected(index)}
                    aria-label={`Remove ${file.name}`}
                    sx={{
                      color: CORP.danger,
                      bgcolor: '#fff1f2',
                      '&:hover': { bgcolor: '#ffe4e6' },
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon="mingcute:close-line" width={16} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        ) : null}

        <CorpBtn variant="blue" disabled={!selectedFiles.length || uploading} onClick={handleUpload}>
          {uploading
            ? 'Uploading…'
            : selectedFiles.length > 1
              ? `Upload ${selectedFiles.length} ZIP files`
              : 'Upload ZIP file'}
        </CorpBtn>
      </CorpCard>
      ) : null}

      <CorpCard sx={{ overflow: 'hidden', p: { xs: 0, sm: 0 } }}>
        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.75, borderBottom: `1px solid ${CORP.line}` }}>
          <Typography sx={{ fontWeight: 700, color: CORP.navy, fontSize: { xs: 15, sm: 16 } }}>
            Uploaded files ({totalItems})
          </Typography>
          <Typography sx={{ color: CORP.muted, fontSize: 13, mt: 0.35 }}>
            Only files uploaded by your account are shown here. ISCA admins can download them from
            the admin portal.
          </Typography>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={corpTableSx(720)}>
            <CorpTableHead
              columns={[
                { label: 'File name' },
                { label: 'Size', sx: { width: 110 } },
                { label: 'Uploaded at', sx: { width: 180 } },
                { label: 'Action', sx: { width: 220, textAlign: 'right' } },
              ]}
            />
            <Box component="tbody">
              {loading ? (
                <Box component="tr">
                  <Box component="td" colSpan={4} sx={{ p: 3, color: CORP.muted, fontSize: 14 }}>
                    Loading uploaded files…
                  </Box>
                </Box>
              ) : rows.length === 0 ? (
                <Box component="tr">
                  <Box component="td" colSpan={4} sx={{ p: 3, color: CORP.muted, fontSize: 14 }}>
                    No ZIP files uploaded yet. Use the upload section above to add files.
                  </Box>
                </Box>
              ) : (
                rows.map((row) => (
                  <Box
                    component="tr"
                    key={row.id}
                    sx={{
                      '& td': {
                        borderBottom: `1px solid ${CORP.line}`,
                        px: 1.5,
                        py: 1.35,
                        verticalAlign: 'middle',
                      },
                    }}
                  >
                    <Box component="td">
                      <Typography
                        sx={{ fontWeight: 700, fontSize: 13.5, color: CORP.ink, wordBreak: 'break-word' }}
                      >
                        {row.originalFileName || 'bulk-enrolment.zip'}
                      </Typography>
                      {row.companyCode ? (
                        <Typography sx={{ fontSize: 12, color: CORP.muted, mt: 0.25 }}>
                          {row.companyCode}
                        </Typography>
                      ) : null}
                    </Box>
                    <Box component="td">
                      <Typography sx={{ fontSize: 13, color: CORP.ink }}>
                        {formatBytes(row.sizeBytes)}
                      </Typography>
                    </Box>
                    <Box component="td">
                      <Typography sx={{ fontSize: 13, color: CORP.ink }}>
                        {formatUploadedAt(row.createdAt)}
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ textAlign: 'right' }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          gap: 0.75,
                          flexWrap: 'wrap',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <CorpBtn
                          variant="ghost"
                          sx={{ minWidth: 0, px: 1.5, py: 0.75 }}
                          disabled={Boolean(downloadingId) || Boolean(deletingId)}
                          onClick={() => handleDownload(row)}
                        >
                          {downloadingId === row.id ? 'Downloading…' : 'Download'}
                        </CorpBtn>
                        <CorpBtn
                          variant="ghost"
                          sx={{
                            minWidth: 0,
                            px: 1.5,
                            py: 0.75,
                            bgcolor: '#fff1f2',
                            color: CORP.danger,
                            '&:hover': { bgcolor: '#ffe4e6' },
                          }}
                          disabled={Boolean(deletingId) || Boolean(downloadingId)}
                          onClick={() => handleDelete(row)}
                        >
                          {deletingId === row.id ? 'Deleting…' : 'Delete'}
                        </CorpBtn>
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>

        {totalItems > 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
              px: { xs: 1, sm: 1.5 },
              py: 0.5,
              borderTop: `1px solid ${CORP.line}`,
              bgcolor: '#fafbfd',
            }}
          >
            <Typography
              sx={{
                fontSize: 12.5,
                color: CORP.muted,
                px: 1,
                py: { xs: 1, sm: 0 },
                alignSelf: 'center',
              }}
            >
              Showing {from}–{to} of {totalItems}
            </Typography>

            <TablePaginationCustom
              component="div"
              page={page}
              dense
              count={totalItems}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              sx={{
                flex: 1,
                minWidth: 0,
                '& .MuiTablePagination-toolbar': {
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', sm: 'flex-end' },
                  pl: 1,
                  pr: 1,
                },
              }}
            />
          </Box>
        ) : null}
      </CorpCard>
    </Box>
  );
}
