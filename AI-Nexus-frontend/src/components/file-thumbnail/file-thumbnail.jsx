import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

import { resolveAssetUrl } from 'src/utils/asset-url';

import { fileThumbnailClasses } from './classes';
import { fileData, fileThumb, fileFormat } from './utils';
import { RemoveButton, DownloadButton } from './action-buttons';

// ----------------------------------------------------------------------

function getThumbnailPreviewUrl(file) {
  if (!file) return null;
  if (typeof file === 'string') return resolveAssetUrl(file);
  if (file instanceof Blob) return URL.createObjectURL(file);
  if (typeof file === 'object') {
    const url = file.preview || file.url || file.fileUrl;
    if (url) return resolveAssetUrl(String(url));
  }
  return null;
}

export function FileThumbnail({
  sx,
  file,
  tooltip,
  onRemove,
  imageView,
  slotProps,
  onDownload,
  ...other
}) {
  const previewUrl = getThumbnailPreviewUrl(file) || '';

  const { name, path } = fileData(file);

  const format = fileFormat(path || name || previewUrl);

  const renderImg = (
    <Box
      component="img"
      src={previewUrl}
      className={fileThumbnailClasses.img}
      sx={{
        width: 1,
        height: 1,
        objectFit: 'cover',
        borderRadius: 'inherit',
        ...slotProps?.img,
      }}
    />
  );

  const renderIcon = (
    <Box
      component="img"
      src={fileThumb(format)}
      className={fileThumbnailClasses.icon}
      sx={{ width: 1, height: 1, ...slotProps?.icon }}
    />
  );

  const renderContent = (
    <Stack
      component="span"
      className={fileThumbnailClasses.root}
      sx={{
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 1.25,
        alignItems: 'center',
        position: 'relative',
        display: 'inline-flex',
        justifyContent: 'center',
        ...sx,
      }}
      {...other}
    >
      {format === 'image' && imageView ? renderImg : renderIcon}

      {onRemove && (
        <RemoveButton
          onClick={onRemove}
          className={fileThumbnailClasses.removeBtn}
          sx={slotProps?.removeBtn}
        />
      )}

      {onDownload && (
        <DownloadButton
          onClick={onDownload}
          className={fileThumbnailClasses.downloadBtn}
          sx={slotProps?.downloadBtn}
        />
      )}
    </Stack>
  );

  if (tooltip) {
    return (
      <Tooltip
        arrow
        title={name}
        slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -12] } }] } }}
      >
        {renderContent}
      </Tooltip>
    );
  }

  return renderContent;
}
