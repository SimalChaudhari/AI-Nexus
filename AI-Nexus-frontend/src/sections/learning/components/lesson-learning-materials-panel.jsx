import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { resolveAssetUrl } from 'src/utils/asset-url';
import { playerFluidType } from 'src/sections/learning/utils/player-responsive-type';

// ----------------------------------------------------------------------

const FILE_META = {
  pdf: { label: 'PDF', icon: 'solar:document-bold', color: '#E53935' },
  doc: { label: 'Word', icon: 'solar:document-text-bold', color: '#1565C0' },
  docx: { label: 'Word', icon: 'solar:document-text-bold', color: '#1565C0' },
  xls: { label: 'Excel', icon: 'solar:chart-bold', color: '#2E7D32' },
  xlsx: { label: 'Excel', icon: 'solar:chart-bold', color: '#2E7D32' },
  csv: { label: 'CSV', icon: 'solar:chart-bold', color: '#2E7D32' },
  ppt: { label: 'PowerPoint', icon: 'solar:presentation-graph-bold', color: '#EF6C00' },
  pptx: { label: 'PowerPoint', icon: 'solar:presentation-graph-bold', color: '#EF6C00' },
  txt: { label: 'Text', icon: 'solar:file-text-bold', color: '#546E7A' },
};

function getExtension(url) {
  const segment = String(url || '').split('?')[0].split('#')[0];
  const match = segment.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

function getFileMeta(url) {
  const ext = getExtension(url);
  return FILE_META[ext] || { label: 'File', icon: 'solar:file-bold', color: '#607D8B' };
}

function fileLabelFromUrl(url, index) {
  const segment = String(url || '').split('/').pop() || '';
  let name = segment;
  try {
    name = decodeURIComponent(segment.split('?')[0]);
  } catch {
    name = segment.split('?')[0];
  }

  const withoutTimestamp = name.replace(/^\d{10,}-/, '');
  const meta = getFileMeta(url);
  const looksLikeHash = /^[a-z0-9]{6,14}\.[^.]+$/i.test(withoutTimestamp);

  if (!withoutTimestamp || looksLikeHash) {
    return `${meta.label} document${index != null ? ` ${index + 1}` : ''}`;
  }

  const cleaned = withoutTimestamp
    .replace(/\.[^.]+$/, '')
    .replace(/-/g, ' ')
    .trim();

  return cleaned || `${meta.label} document`;
}

function buildDownloadName(row) {
  const base = String(row.name || 'file').replace(/\.[^.]+$/i, '').trim() || 'file';
  return row.ext ? `${base}.${row.ext}` : base;
}

async function downloadMaterialFile(row) {
  const url = resolveAssetUrl(row.url);
  const filename = buildDownloadName(row);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Download failed');
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function buildMaterialRows(materials) {
  return (materials || [])
    .filter(Boolean)
    .map((url, index) => ({
      id: `${url}-${index}`,
      url,
      index,
      ext: getExtension(url),
      meta: getFileMeta(url),
      name: fileLabelFromUrl(url, index),
    }));
}

export function LessonLearningMaterialsPanel({ materials = [] }) {
  const theme = useTheme();
  const rows = useMemo(() => buildMaterialRows(materials), [materials]);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (row) => {
    setDownloadingId(row.id);
    try {
      await downloadMaterialFile(row);
    } finally {
      setDownloadingId(null);
    }
  };

  if (!rows.length) {
    return (
      <Box
        sx={{
          py: 4,
          px: 2,
          textAlign: 'center',
          borderRadius: 2,
          border: `1px dashed ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.grey[500], 0.04),
        }}
      >
        <Iconify icon="solar:folder-open-bold" width={40} sx={{ color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No learning materials for this lesson.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', fontWeight: 500, fontSize: playerFluidType.body }}
      >
        {rows.length} file{rows.length === 1 ? '' : 's'} — download to open on your device
      </Typography>

      <Stack spacing={1}>
        {rows.map((row) => (
          <Box
            key={row.id}
            sx={{
              p: 1.75,
              borderRadius: 1.5,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
              transition: 'border-color 0.2s',
              '&:hover': {
                borderColor: alpha(theme.palette.primary.main, 0.4),
              },
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
                <Box
                  sx={{
                    width: { xs: 40, sm: 44 },
                    height: { xs: 40, sm: 44 },
                    borderRadius: 1,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(row.meta.color, 0.12),
                    color: row.meta.color,
                  }}
                >
                  <Iconify icon={row.meta.icon} width={24} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      fontSize: playerFluidType.label,
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                    }}
                  >
                    {row.name}
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="center"
                    flexWrap="wrap"
                    spacing={0.75}
                    sx={{ mt: 0.5, gap: 0.75 }}
                  >
                    <Chip
                      label={row.meta.label}
                      size="small"
                      sx={{
                        height: { xs: 22, sm: 20 },
                        fontSize: playerFluidType.caption,
                        fontWeight: 700,
                        bgcolor: alpha(row.meta.color, 0.1),
                        color: row.meta.color,
                      }}
                    />
                    {row.ext ? (
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontSize: playerFluidType.caption }}
                      >
                        .{row.ext.toUpperCase()}
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              </Stack>

              <Button
                variant="contained"
                color="primary"
                size="small"
                disabled={downloadingId === row.id}
                onClick={() => handleDownload(row)}
                startIcon={<Iconify icon="eva:download-outline" width={18} />}
                sx={{
                  flexShrink: 0,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  px: 2,
                  fontSize: playerFluidType.body,
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                {downloadingId === row.id ? 'Downloading…' : 'Download'}
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
