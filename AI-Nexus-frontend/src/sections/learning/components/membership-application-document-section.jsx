import { useCallback, useEffect, useRef, useState } from 'react';

import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { MembershipFormTextField } from 'src/components/membership-form-textfield';
import { fetchAvailableDocumentTypes } from 'src/api/membership-application';
import { ensureMembershipSalesforceSession } from 'src/utils/membership-salesforce-auth';
import {
  MEMBERSHIP_DOCUMENT_ACCEPT,
  isDocumentTypeFulfilled,
  normalizeDocumentTypesResponse,
} from 'src/utils/membership-application-document';

// ----------------------------------------------------------------------

export function MembershipApplicationDocumentSection({
  applicationId,
  documentUpload,
  documentFiles,
  onFileSelect,
  onFileRemove,
  onOtherDetailsChange,
  onDocumentTypesLoaded,
}) {
  const theme = useTheme();
  const { primary } = theme.palette;

  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [fileInputKeys, setFileInputKeys] = useState({});
  const onDocumentTypesLoadedRef = useRef(onDocumentTypesLoaded);
  const lastLoadedApplicationIdRef = useRef('');

  useEffect(() => {
    onDocumentTypesLoadedRef.current = onDocumentTypesLoaded;
  }, [onDocumentTypesLoaded]);

  const loadDocumentTypes = useCallback(async () => {
    const appId = applicationId?.trim();
    if (!appId) {
      setLoadError('Application ID is required before uploading documents.');
      setDocumentTypes([]);
      return;
    }

    let session;
    try {
      session = ensureMembershipSalesforceSession();
    } catch (error) {
      if (error?.code === 'SALESFORCE_SOCIAL_TOKEN_EXPIRED') {
        return;
      }
      setLoadError(error instanceof Error ? error.message : 'Salesforce sign-in is required.');
      setDocumentTypes([]);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchAvailableDocumentTypes({
        socialAccessToken: session.socialToken,
        applicationId: appId,
      });
      const types = normalizeDocumentTypesResponse(data);
      setDocumentTypes(types);
      onDocumentTypesLoadedRef.current?.(types);
      if (!types.length) {
        setLoadError('No document types were returned for this application.');
      }
    } catch (err) {
      setDocumentTypes([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load document types.');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    const appId = applicationId?.trim();
    if (!appId) {
      lastLoadedApplicationIdRef.current = '';
      return;
    }
    if (lastLoadedApplicationIdRef.current === appId) {
      return;
    }
    lastLoadedApplicationIdRef.current = appId;
    loadDocumentTypes();
  }, [applicationId, loadDocumentTypes]);

  const handleRemoveFile = (documentType) => {
    onFileRemove?.(documentType);
    setFileInputKeys((prev) => ({
      ...prev,
      [documentType]: (prev[documentType] || 0) + 1,
    }));
  };

  const handleViewFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (loading) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Loading required documents…
        </Typography>
      </Stack>
    );
  }

  if (loadError && !documentTypes.length) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError}</Alert>
        <Button
          variant="outlined"
          onClick={() => {
            lastLoadedApplicationIdRef.current = '';
            loadDocumentTypes();
          }}
          sx={{ alignSelf: 'flex-start' }}
        >
          Retry
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Upload each document listed below. Required documents are marked. Files are sent to ISCA
        eServices when you submit this section.
      </Typography>

      {loadError && (
        <Alert severity="warning" onClose={() => setLoadError('')}>
          {loadError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {documentTypes.map((type) => {
          const entry = documentUpload?.entries?.[type.value] || {};
          const selectedFile = documentFiles[type.value];
          const isUploadedToIsca = Boolean(type.isUploaded || entry.uploadedToSalesforce);
          const hasPendingFile = Boolean(selectedFile);
          const displayFileName =
            selectedFile?.name
            || entry.uploadedFileName
            || entry.fileName
            || type.uploadedFileName;
          const isFulfilled = isDocumentTypeFulfilled(
            type,
            documentFiles,
            documentUpload?.entries
          );

          return (
            <Grid item xs={12} key={type.value}>
              <Stack
                spacing={1.5}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${
                    isUploadedToIsca || isFulfilled
                      ? theme.palette.success.main
                      : alpha(primary.main, 0.22)
                  }`,
                  bgcolor:
                    isUploadedToIsca || isFulfilled
                      ? alpha(theme.palette.success.main, 0.04)
                      : alpha(primary.main, 0.02),
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
                    {type.label}
                  </Typography>
                  {isUploadedToIsca ? (
                    <Chip
                      size="small"
                      color="success"
                      icon={<Iconify icon="solar:check-circle-bold" width={16} />}
                      label="Uploaded to ISCA"
                    />
                  ) : type.isMandatory ? (
                    <Chip size="small" color="error" label="Required" />
                  ) : (
                    <Chip size="small" variant="outlined" label="Optional" />
                  )}
                </Stack>

                {isUploadedToIsca ? (
                  <Alert severity="success" icon={false} sx={{ py: 0.75 }}>
                    <Typography variant="body2">
                      This document is already on file with ISCA eServices
                      {displayFileName ? ` (${displayFileName})` : ''}. Duplicate uploads are not
                      allowed — continue with your other documents.
                    </Typography>
                  </Alert>
                ) : (
                  <>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ sm: 'center' }}
                    >
                      <Button
                        variant="outlined"
                        component="label"
                        sx={{
                          flex: { sm: 1 },
                          py: 1.25,
                          justifyContent: 'flex-start',
                          textTransform: 'none',
                          borderStyle: hasPendingFile ? 'solid' : 'dashed',
                        }}
                        startIcon={
                          <Iconify
                            icon={hasPendingFile ? 'solar:pen-2-bold' : 'solar:add-circle-bold'}
                            width={20}
                          />
                        }
                      >
                        {hasPendingFile ? 'Replace file' : 'Add file'}
                        <input
                          key={`${type.value}-${fileInputKeys[type.value] || 0}`}
                          hidden
                          type="file"
                          accept={MEMBERSHIP_DOCUMENT_ACCEPT}
                          onChange={(event) => {
                            onFileSelect(type.value, event.target.files?.[0]);
                            event.target.value = '';
                          }}
                        />
                      </Button>

                      {hasPendingFile && (
                        <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Iconify icon="solar:eye-bold" width={18} />}
                            onClick={() => handleViewFile(selectedFile)}
                            sx={{ textTransform: 'none' }}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={18} />}
                            onClick={() => handleRemoveFile(type.value)}
                            sx={{ textTransform: 'none' }}
                          >
                            Remove
                          </Button>
                        </Stack>
                      )}
                    </Stack>

                    {hasPendingFile && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Iconify
                          icon="solar:file-check-bold"
                          width={20}
                          sx={{ color: 'success.main', flexShrink: 0 }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                          {displayFileName} — ready to submit
                        </Typography>
                      </Stack>
                    )}

                    <Typography variant="caption" color="text.secondary">
                      Accepted: PDF, DOC, DOCX, or image
                    </Typography>
                  </>
                )}

                <MembershipFormTextField
                  label="Other details (optional)"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  value={entry.otherDetails || ''}
                  onChange={(e) => onOtherDetailsChange(type.value, e.target.value)}
                  placeholder="Add notes for this document if needed"
                  disabled={isUploadedToIsca}
                />
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
