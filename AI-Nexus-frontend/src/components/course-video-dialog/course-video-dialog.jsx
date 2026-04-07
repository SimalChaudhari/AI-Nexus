import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { getYouTubeEmbedUrl } from 'src/utils/youtube';

// ----------------------------------------------------------------------

/**
 * Reusable dialog to preview a course video (YouTube embed or "Open video" link).
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onClose - Called when dialog should close
 * @param {string} title - Dialog title (e.g. course name)
 * @param {string} videoUrl - Full video URL (YouTube or other)
 */
export function CourseVideoDialog({ open, onClose, title, videoUrl }) {
  const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxWidth: '70%', maxHeight: '100%' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1,
          padding: { xs: '8px 15px', md: '16px 24px' },
        }}
      >
        <Typography
          variant="h6"
          noWrap
          sx={{ flex: 1, fontSize: { xs: '1rem', md: '1.25rem' } }}
        >
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Iconify icon="solar:close-circle-bold" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {embedUrl ? (
          <Box
            sx={{
              position: 'relative',
              pt: '56.25%',
              overflow: 'hidden',
              bgcolor: 'grey.900',
            }}
          >
            <Box
              component="iframe"
              src={embedUrl}
              title="Course video"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </Box>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Video cannot be embedded. Open in new tab to watch.
            </Typography>
            <Button
              component="a"
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              startIcon={<Iconify icon="solar:play-circle-bold" width={20} />}
            >
              Open video
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
