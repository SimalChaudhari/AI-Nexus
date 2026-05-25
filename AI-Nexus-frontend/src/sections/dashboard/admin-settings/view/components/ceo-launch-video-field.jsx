import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { CONFIG } from 'src/config-global';

function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) return null;
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^&?]+)/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

function resolveAssetUrl(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

const VIDEO_ACCEPT =
  '.mp4,.webm,.mov,.avi,.mkv,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska';

export function CeoLaunchVideoField({
  videoUrl = '',
  onVideoUrlChange,
  videoFile,
  onVideoFileSelect,
  onClearPendingFile,
  uploadedVideoUrl = '',
  videoSubmitting = false,
  contentSubmitting = false,
  onVideoSave,
  onRemoveUploadedVideo,
  onRemoveAllVideo,
  maxSizeMb = 100,
}) {
  const trimmedUrl = String(videoUrl || '').trim();
  const hasUploadedVideo = Boolean(String(uploadedVideoUrl || '').trim());
  const hasPendingFile = Boolean(videoFile);
  const hasActiveVideo = hasUploadedVideo || hasPendingFile || Boolean(trimmedUrl);

  const pendingPreviewUrl = useMemo(
    () => (videoFile instanceof File ? URL.createObjectURL(videoFile) : ''),
    [videoFile]
  );

  const savedUploadPreviewUrl = hasUploadedVideo ? resolveAssetUrl(uploadedVideoUrl) : '';
  const youtubeEmbed = !hasPendingFile && !hasUploadedVideo ? getYouTubeEmbedUrl(trimmedUrl) : null;

  const previewBox = (() => {
    if (pendingPreviewUrl || savedUploadPreviewUrl) {
      const src = pendingPreviewUrl || savedUploadPreviewUrl;
      return (
        <Box
          component="video"
          src={src}
          controls
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            bgcolor: 'common.black',
          }}
        />
      );
    }
    if (youtubeEmbed) {
      return (
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <Box
            component="iframe"
            title="CEO launch video preview"
            src={youtubeEmbed}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
        </Box>
      );
    }
    if (trimmedUrl) {
      return (
        <Box
          component="video"
          src={trimmedUrl}
          controls
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            bgcolor: 'common.black',
          }}
        />
      );
    }
    return null;
  })();

  const urlDisabled = hasUploadedVideo || hasPendingFile || videoSubmitting || contentSubmitting;
  const uploadDisabled = Boolean(trimmedUrl) || hasUploadedVideo || videoSubmitting || contentSubmitting;

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.neutral',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        Section video
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25, mb: 1.25 }}>
        Video URL or file upload — only one at a time. Saving a URL clears any uploaded file.
      </Typography>

      {hasActiveVideo ? (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Button
            size="small"
            color="error"
            onClick={onRemoveAllVideo}
            disabled={videoSubmitting || contentSubmitting}
          >
            Remove video
          </Button>
        </Stack>
      ) : null}

      {previewBox ? (
        <Box
          sx={{
            position: 'relative',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: 'common.black',
            width: '100%',
            maxWidth: 240,
            aspectRatio: '16 / 9',
            height: 'auto',
            mb: 1.25,
          }}
        >
          {previewBox}
        </Box>
      ) : null}

      <TextField
        label="Video URL"
        value={videoUrl}
        onChange={(e) => onVideoUrlChange(e.target.value)}
        placeholder="Optional: YouTube or video URL"
        disabled={urlDisabled}
        fullWidth
        size="small"
        helperText={
          hasUploadedVideo || hasPendingFile
            ? 'Remove the uploaded file before using a URL.'
            : 'Saved with “Save CEO launch section”.'
        }
      />

      <Box
        sx={{
          mt: 1.25,
          p: 1.25,
          borderRadius: 1,
          border: (theme) => `1px dashed ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          opacity: uploadDisabled ? 0.55 : 1,
          pointerEvents: uploadDisabled ? 'none' : 'auto',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <Button variant="outlined" size="small" component="label">
            {videoFile ? 'Replace video' : 'Upload video file'}
            <input
              hidden
              type="file"
              accept={VIDEO_ACCEPT}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onVideoFileSelect(file);
                event.target.value = '';
              }}
            />
          </Button>
          <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 0 }} noWrap>
            {videoFile ? videoFile.name : 'No video selected'}
          </Typography>
          {videoFile ? (
            <Button size="small" color="error" onClick={onClearPendingFile} disabled={videoSubmitting}>
              Cancel
            </Button>
          ) : null}
        </Stack>
        <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: 'text.secondary' }}>
          MP4, WebM, MOV, AVI, MKV — max {maxSizeMb} MB. Upload replaces any saved URL.
        </Typography>
      </Box>

      {hasPendingFile ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
          <LoadingButton
            size="small"
            variant="contained"
            loading={videoSubmitting}
            onClick={onVideoSave}
            disabled={uploadDisabled}
          >
            Save video file
          </LoadingButton>
        </Stack>
      ) : null}

      {hasUploadedVideo && !hasPendingFile ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            size="small"
            color="inherit"
            variant="outlined"
            onClick={onRemoveUploadedVideo}
            disabled={videoSubmitting || contentSubmitting}
          >
            Remove uploaded file
          </Button>
        </Stack>
      ) : null}
    </Box>
  );
}
