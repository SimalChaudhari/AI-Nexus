import { useRef, useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import { editorClasses } from '../classes';
import { ToolbarItem } from './toolbar-item';

const WIDTH_OPTIONS = ['25%', '50%', '75%', '100%'];

// ----------------------------------------------------------------------

export function ImageBlock({ editor, onUploadImage }) {
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const [anchorEl, setAnchorEl] = useState(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const previousImageSelectedRef = useRef(false);

  const handleOpenPopover = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const insertImageAndCreateTextSpace = (attrs) => {
    editor
      ?.chain()
      .focus()
      .setImage(attrs)
      .createParagraphNear()
      .focus()
      .run();
  };

  const handleUpdateUrl = useCallback(() => {
    handleClosePopover();

    if (anchorEl) {
      insertImageAndCreateTextSpace({ src: url, width: '50%', align: 'left' });
    }
  }, [anchorEl, editor, url]);

  const handleUploadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUploadImage) return;
    try {
      setUploading(true);
      const uploadedUrl = await onUploadImage(file);
      if (uploadedUrl) {
        const hasImageMime = file.type?.startsWith('image/');
        const hasImageExtension = /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name || '');
        if (hasImageMime || hasImageExtension) {
          insertImageAndCreateTextSpace({ src: uploadedUrl, width: '50%', align: 'left' });
        } else {
          editor
            ?.chain()
            .focus()
            .insertContent(
              `<p><a href="${uploadedUrl}" target="_blank" rel="noopener noreferrer">${file.name || 'Open document'}</a></p>`
            )
            .run();
        }
        handleClosePopover();
      }
    } finally {
      setUploading(false);
    }
  };

  if (!editor) {
    return null;
  }

  const isImageSelected = editor.isActive('image');
  const imageAttrs = isImageSelected ? editor.getAttributes('image') : {};

  const rawWidthStr = (imageAttrs.width ?? '').toString().trim();
  const alignKey = (imageAttrs.align ?? 'center').toString().toLowerCase();
  const isCustomWidth = Boolean(rawWidthStr && !WIDTH_OPTIONS.includes(rawWidthStr));

  const setImageWidth = (width) => {
    editor?.chain().focus().updateAttributes('image', { width }).run();
  };
  const setImageAlign = (align) => {
    editor?.chain().focus().updateAttributes('image', { align }).run();
  };

  const removeImage = () => {
    editor?.chain().focus().deleteSelection().run();
    setManageDialogOpen(false);
  };

  useEffect(() => {
    if (!editor) return undefined;

    const syncImageManageDialog = () => {
      const selected = editor.isActive('image');
      const wasSelected = previousImageSelectedRef.current;

      if (selected && !wasSelected) {
        setManageDialogOpen(true);
      }
      if (!selected && wasSelected) {
        setManageDialogOpen(false);
      }

      previousImageSelectedRef.current = selected;
    };

    syncImageManageDialog();
    editor.on('selectionUpdate', syncImageManageDialog);

    return () => {
      editor.off('selectionUpdate', syncImageManageDialog);
    };
  }, [editor]);

  return (
    <>
      <ToolbarItem
        aria-label="Image"
        className={editorClasses.toolbar.image}
        onClick={handleOpenPopover}
        icon={
          <path d="M20 5H4V19L13.2923 9.70649C13.6828 9.31595 14.3159 9.31591 14.7065 9.70641L20 15.0104V5ZM2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11Z" />
        }
      />

      <Popover
        id={anchorEl ? 'simple-popover' : undefined}
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 2.5 } } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          URL
        </Typography>

        <Stack direction="row" alignItems="center" spacing={1}>
          <TextField
            size="small"
            placeholder="Enter URL here..."
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
            }}
            sx={{ width: 240 }}
          />
          <Button variant="contained" onClick={handleUpdateUrl}>
            Apply
          </Button>
        </Stack>

        {onUploadImage ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
            <LoadingButton
              loading={uploading}
              variant="outlined"
              component="label"
            >
              Upload media
              <input
                hidden
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleUploadFile}
              />
            </LoadingButton>
          </Stack>
        ) : null}

      </Popover>

      <Dialog
        open={manageDialogOpen && isImageSelected}
        onClose={() => setManageDialogOpen(false)}
        maxWidth={false}
        fullWidth={false}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              overflow: 'hidden',
              width: 'min(100%, 440px)',
              maxWidth: 'calc(100vw - 24px)',
            },
          },
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            pr: 0.5,
            py: 1.5,
            px: 2.5,
            borderBottom: (t) => `1px solid ${t.vars?.palette?.divider ?? t.palette.divider}`,
            bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.1 : 0.05),
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  bgcolor: alpha(theme.palette.primary.main, 0.14),
                  color: 'primary.main',
                }}
              >
                <Iconify icon="solar:gallery-bold-duotone" width={24} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 700, lineHeight: 1.25, fontSize: '1.05rem' }}>
                  Image settings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.35, mt: 0.25 }}>
                  Resize, align, and wrap text beside the image
                </Typography>
              </Box>
            </Stack>
            <IconButton
              aria-label="Close"
              edge="end"
              size="small"
              onClick={() => setManageDialogOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <Iconify icon="mingcute:close-line" width={20} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, py: 2.5 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Width preset
              </Typography>
              <Stack direction="row" spacing={1} sx={{ width: 1 }}>
                {WIDTH_OPTIONS.map((w) => (
                  <Button
                    key={w}
                    fullWidth
                    size="medium"
                    variant={rawWidthStr === w ? 'contained' : 'outlined'}
                    onClick={() => setImageWidth(w)}
                    aria-pressed={rawWidthStr === w}
                    aria-label={`Set width to ${w}`}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      py: 1.1,
                      fontWeight: 700,
                      textTransform: 'none',
                    }}
                  >
                    {w}
                  </Button>
                ))}
              </Stack>
              {isCustomWidth ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, lineHeight: 1.4 }}>
                  The editor width is custom ({rawWidthStr}). Choose a preset above to normalize.
                </Typography>
              ) : null}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Alignment
              </Typography>
              <Stack direction="row" spacing={1} sx={{ width: 1 }}>
                {[
                  { value: 'left', label: 'Left', icon: 'ic:round-format-align-left' },
                  { value: 'center', label: 'Center', icon: 'ic:round-format-align-center' },
                  { value: 'right', label: 'Right', icon: 'ic:round-format-align-right' },
                ].map(({ value, label, icon }) => (
                  <Button
                    key={value}
                    fullWidth
                    size="medium"
                    variant={alignKey === value ? 'contained' : 'outlined'}
                    onClick={() => setImageAlign(value)}
                    aria-pressed={alignKey === value}
                    aria-label={`Align ${label}`}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      py: 1.25,
                      flexDirection: 'column',
                      gap: 0.5,
                      textTransform: 'none',
                      fontWeight: 700,
                    }}
                  >
                    <Iconify icon={icon} width={22} />
                    <Typography component="span" variant="caption" sx={{ fontWeight: 700, lineHeight: 1, display: 'block' }}>
                      {label}
                    </Typography>
                  </Button>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Text beside image
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25, lineHeight: 1.45 }}>
                Sets width to 40% and opens a new paragraph for copy next to the image.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ width: 1 }}>
                <Button
                  fullWidth
                  size="medium"
                  variant="outlined"
                  color="inherit"
                  onClick={() => {
                    setImageAlign('left');
                    setImageWidth('40%');
                    editor?.chain().focus().createParagraphNear().focus().run();
                  }}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    py: 1.25,
                    textTransform: 'none',
                    fontWeight: 700,
                    flexDirection: 'column',
                    gap: 0.75,
                  }}
                >
                  <Iconify icon="solar:sidebar-minimalistic-bold" width={22} />
                  <Typography component="span" variant="caption" sx={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.25, display: 'block' }}>
                    Image left, text right
                  </Typography>
                </Button>
                <Button
                  fullWidth
                  size="medium"
                  variant="outlined"
                  color="inherit"
                  onClick={() => {
                    setImageAlign('right');
                    setImageWidth('40%');
                    editor?.chain().focus().createParagraphNear().focus().run();
                  }}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    py: 1.25,
                    textTransform: 'none',
                    fontWeight: 700,
                    flexDirection: 'column',
                    gap: 0.75,
                  }}
                >
                  <Iconify icon="solar:sidebar-minimalistic-bold" width={22} sx={{ transform: 'scaleX(-1)' }} />
                  <Typography component="span" variant="caption" sx={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.25, display: 'block' }}>
                    Image right, text left
                  </Typography>
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            py: 2,
            gap: 1.5,
            borderTop: (t) => `1px solid ${t.vars?.palette?.divider ?? t.palette.divider}`,
            bgcolor: (t) => alpha(t.palette.grey[500], t.palette.mode === 'dark' ? 0.06 : 0.03),
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ width: 1 }}>
            <Button
              color="error"
              variant="outlined"
              size="medium"
              fullWidth
              startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={18} />}
              onClick={removeImage}
              sx={{ flex: 1, textTransform: 'none', fontWeight: 700, py: 1 }}
            >
              Remove image
            </Button>
            <Button
              variant="contained"
              size="medium"
              fullWidth
              onClick={() => setManageDialogOpen(false)}
              sx={{ flex: 1, textTransform: 'none', fontWeight: 700, py: 1 }}
            >
              Done
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
}
