import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
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
import { readMembershipSalesforceSession } from 'src/utils/membership-salesforce-session';
import {
  MEMBERSHIP_DOCUMENT_ACCEPT,
  normalizeDocumentTypesResponse,
} from 'src/utils/membership-application-document';

// ----------------------------------------------------------------------

export function MembershipApplicationDocumentSection({
  applicationId,
  documentUpload,
  documentFiles,
  onFileSelect,
  onOtherDetailsChange,
  onDocumentTypesLoaded,
}) {
  const theme = useTheme();
  const { primary } = theme.palette;

  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadDocumentTypes = useCallback(async () => {
    const session = readMembershipSalesforceSession();
    const appId = applicationId?.trim();
    if (!session?.socialToken || !appId) {
      setLoadError('Application ID and Salesforce sign-in are required before uploading documents.');
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
      onDocumentTypesLoaded?.(types);
      if (!types.length) {
        setLoadError('No document types were returned for this application.');
      }
    } catch (err) {
      setDocumentTypes([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load document types.');
    } finally {
      setLoading(false);
    }
  }, [applicationId, onDocumentTypesLoaded]);

  useEffect(() => {
    loadDocumentTypes();
  }, [loadDocumentTypes]);

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
        <Button variant="outlined" onClick={loadDocumentTypes} sx={{ alignSelf: 'flex-start' }}>
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
          const hasFile = Boolean(selectedFile || entry.fileName);

          return (
            <Grid item xs={12} key={type.value}>
              <Stack
                spacing={1.5}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${hasFile ? theme.palette.success.main : alpha(primary.main, 0.22)}`,
                  bgcolor: hasFile
                    ? alpha(theme.palette.success.main, 0.04)
                    : alpha(primary.main, 0.02),
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
                    {type.label}
                  </Typography>
                  {type.isMandatory ? (
                    <Chip size="small" color="error" label="Required" />
                  ) : (
                    <Chip size="small" variant="outlined" label="Optional" />
                  )}
                </Stack>

                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  sx={{
                    py: 1.75,
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderStyle: hasFile ? 'solid' : 'dashed',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: 1 }}>
                    <Iconify
                      icon={hasFile ? 'solar:file-check-bold' : 'solar:upload-bold'}
                      width={24}
                      sx={{ color: hasFile ? 'success.main' : 'primary.main' }}
                    />
                    <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selectedFile?.name || entry.fileName || 'Choose file'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        PDF, DOC, DOCX, or image
                      </Typography>
                    </Box>
                  </Stack>
                  <input
                    hidden
                    type="file"
                    accept={MEMBERSHIP_DOCUMENT_ACCEPT}
                    onChange={(event) => onFileSelect(type.value, event.target.files?.[0])}
                  />
                </Button>

                <MembershipFormTextField
                  label="Other details (optional)"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  value={entry.otherDetails || ''}
                  onChange={(e) => onOtherDetailsChange(type.value, e.target.value)}
                  placeholder="Add notes for this document if needed"
                />
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
