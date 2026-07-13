import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { resolveAssetUrl } from 'src/utils/asset-url';

import { varAlpha } from 'src/theme/styles';

import { Iconify } from '../../iconify';
import { fileData, FileThumbnail } from '../../file-thumbnail';

// ----------------------------------------------------------------------

function getMultiFilePreviewUrl(file) {
  if (!file) return null;
  if (typeof file === 'string') return resolveAssetUrl(file);
  if (file instanceof Blob) return URL.createObjectURL(file);
  if (typeof file === 'object') {
    const url = file.preview || file.url || file.fileUrl;
    if (url) return resolveAssetUrl(String(url));
  }
  return null;
}

function getMultiFileKey(file, index) {
  if (typeof file === 'string') return `${file}-${index}`;
  if (file instanceof Blob) {
    return `${file.name || 'blob'}-${file.size}-${file.lastModified || index}`;
  }
  return `${file?.fileUrl || file?.url || file?.name || 'file'}-${index}`;
}

export function MultiFilePreview({
  sx,
  onRemove,
  showViewButton = false,
  lastNode,
  thumbnail,
  slotProps,
  firstNode,
  files = [],
}) {
  const renderFirstNode = firstNode && (
    <Box
      component="li"
      sx={{
        ...(thumbnail && {
          width: 'auto',
          display: 'inline-flex',
        }),
      }}
    >
      {firstNode}
    </Box>
  );

  const renderLastNode = lastNode && (
    <Box
      component="li"
      sx={{
        ...(thumbnail && { width: 'auto', display: 'inline-flex' }),
      }}
    >
      {lastNode}
    </Box>
  );

  return (
    <Box
      component="ul"
      sx={{
        gap: 1,
        display: 'flex',
        flexDirection: 'column',
        ...(thumbnail && {
          flexWrap: 'wrap',
          flexDirection: 'row',
        }),
        ...sx,
      }}
    >
      {renderFirstNode}

      {files.map((file, index) => {
        const { name } = fileData(file);
        const viewUrl = getMultiFilePreviewUrl(file);
        const itemKey = getMultiFileKey(file, index);

        if (thumbnail) {
          return (
            <Box component="li" key={itemKey} sx={{ display: 'inline-flex' }}>
              <FileThumbnail
                tooltip
                imageView
                file={file}
                onRemove={() => onRemove?.(file)}
                sx={{
                  width: 80,
                  height: 80,
                  border: (theme) =>
                    `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
                }}
                slotProps={{ icon: { width: 36, height: 36 } }}
                {...slotProps?.thumbnail}
              />
            </Box>
          );
        }

        return (
          <Box
            component="li"
            key={itemKey}
            sx={{
              py: 1,
              pr: 1,
              pl: 1.5,
              gap: 1.5,
              display: 'flex',
              borderRadius: 1,
              alignItems: 'center',
              border: (theme) =>
                `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
            }}
          >
            <FileThumbnail file={file} {...slotProps?.thumbnail} />

            <ListItemText
              primary={name || 'File'}
              secondary=""
              secondaryTypographyProps={{ component: 'span', typography: 'caption' }}
            />

            {showViewButton && viewUrl ? (
              <Button
                size="small"
                variant="outlined"
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View
              </Button>
            ) : null}

            {onRemove && (
              <IconButton size="small" onClick={() => onRemove(file)}>
                <Iconify icon="mingcute:close-line" width={16} />
              </IconButton>
            )}
          </Box>
        );
      })}

      {renderLastNode}
    </Box>
  );
}
