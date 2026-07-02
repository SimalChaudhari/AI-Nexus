import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

import { varAlpha } from 'src/theme/styles';

import { Iconify } from '../../iconify';
import { resolveAssetUrl } from 'src/utils/asset-url';

// ----------------------------------------------------------------------

function getPreviewFileName(file) {
  if (file && typeof file === 'object' && !(file instanceof Blob) && file.name) {
    return String(file.name);
  }
  if (typeof file === 'string') {
    const path = file.split('?')[0];
    return decodeURIComponent(path.split('/').pop() || 'File');
  }
  return file?.name || 'File';
}

function getPreviewUrl(file) {
  if (file && typeof file === 'object' && !(file instanceof Blob) && file.url) {
    return resolveAssetUrl(String(file.url));
  }
  if (typeof file === 'string') return resolveAssetUrl(file);
  if (file instanceof Blob) return URL.createObjectURL(file);
  return null;
}

export function SingleFilePreview({ file, objectFit = 'contain', showViewButton = false }) {
  const fileName = getPreviewFileName(file);
  const previewUrl = getPreviewUrl(file);
  const isImagePreview =
    (file && typeof file === 'object' && !(file instanceof Blob) && file.url
      ? /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(file.url))
      : typeof file === 'string'
        ? /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file)
        : String(file?.type || '').startsWith('image/'));

  if (!previewUrl) return null;

  return (
    <Box
      sx={{
        p: objectFit === 'cover' ? 0 : 1,
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        position: 'absolute',
      }}
    >
      {isImagePreview ? (
        <Box
          component="img"
          alt={fileName}
          src={previewUrl}
          sx={{
            width: 1,
            height: 1,
            borderRadius: 1,
            objectFit,
          }}
        />
      ) : (
        <Box
          sx={{
            width: 1,
            height: 1,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 1,
            bgcolor: (theme) => theme.vars.palette.background.neutral,
            color: 'text.secondary',
            px: 2,
            textAlign: 'center',
          }}
        >
          <Iconify icon="solar:document-bold" width={40} />
          <Box component="span" sx={{ typography: 'caption', fontWeight: 600, wordBreak: 'break-word' }}>
            {fileName}
          </Box>
        </Box>
      )}

      {showViewButton && (
        <IconButton
          size="small"
          component="a"
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            left: 16,
            top: 16,
            zIndex: 9,
            position: 'absolute',
            color: (theme) => varAlpha(theme.vars.palette.common.whiteChannel, 0.8),
            bgcolor: (theme) => varAlpha(theme.vars.palette.grey['900Channel'], 0.72),
            '&:hover': { bgcolor: (theme) => varAlpha(theme.vars.palette.grey['900Channel'], 0.48) },
          }}
        >
          <Iconify icon="solar:eye-bold" width={18} />
        </IconButton>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function DeleteButton({ sx, ...other }) {
  return (
    <IconButton
      size="small"
      sx={{
        top: 16,
        right: 16,
        zIndex: 9,
        position: 'absolute',
        color: (theme) => varAlpha(theme.vars.palette.common.whiteChannel, 0.8),
        bgcolor: (theme) => varAlpha(theme.vars.palette.grey['900Channel'], 0.72),
        '&:hover': { bgcolor: (theme) => varAlpha(theme.vars.palette.grey['900Channel'], 0.48) },
        ...sx,
      }}
      {...other}
    >
      <Iconify icon="mingcute:close-line" width={18} />
    </IconButton>
  );
}
