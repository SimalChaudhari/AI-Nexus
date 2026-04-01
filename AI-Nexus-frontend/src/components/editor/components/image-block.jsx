import { useRef, useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { editorClasses } from '../classes';
import { ToolbarItem } from './toolbar-item';

// ----------------------------------------------------------------------

export function ImageBlock({ editor, onUploadImage }) {
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

      <Dialog open={manageDialogOpen && isImageSelected} onClose={() => setManageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Selected Image</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Image size
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button size="small" variant="outlined" onClick={() => setImageWidth('25%')}>25%</Button>
              <Button size="small" variant="outlined" onClick={() => setImageWidth('50%')}>50%</Button>
              <Button size="small" variant="outlined" onClick={() => setImageWidth('75%')}>75%</Button>
              <Button size="small" variant="outlined" onClick={() => setImageWidth('100%')}>100%</Button>
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Position
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button size="small" variant="outlined" onClick={() => setImageAlign('left')}>Left</Button>
              <Button size="small" variant="outlined" onClick={() => setImageAlign('center')}>Center</Button>
              <Button size="small" variant="outlined" onClick={() => setImageAlign('right')}>Right</Button>
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Quick layout
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setImageAlign('left');
                  setImageWidth('40%');
                  editor?.chain().focus().createParagraphNear().focus().run();
                }}
              >
                Image left + text right
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setImageAlign('right');
                  setImageWidth('40%');
                  editor?.chain().focus().createParagraphNear().focus().run();
                }}
              >
                Image right + text left
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={removeImage}>
            Remove image
          </Button>
          <Button onClick={() => setManageDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
