import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

export function HexColorToolDrawer({
  open,
  onClose,
  startColor,
  endColor,
  onStartColorChange,
  onEndColorChange,
  onApplyHeadingColor,
  onApplyAccentColor,
  headingColor,
  accentColor,
  title = 'HEX Color Tool',
  description = 'Pick color from box or type HEX. Then apply to fields.',
  startLabel = 'Primary HEX',
  endLabel = 'Secondary HEX',
  applyStartLabel = 'Apply',
  applyEndLabel = 'Apply',
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 430 }, p: 2.5 } }}
    >
      <Stack spacing={2.25}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{title}</Typography>
          <Button color="inherit" onClick={onClose}>
            Close
          </Button>
        </Stack>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>

        <Stack spacing={1.5} sx={{ p: 1.5, borderRadius: 1.5, border: (theme) => `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              component="input"
              type="color"
              value={startColor}
              onChange={onStartColorChange}
              sx={{
                width: 42,
                height: 42,
                border: 'none',
                p: 0,
                bgcolor: 'transparent',
                cursor: 'pointer',
              }}
            />
            <TextField label={startLabel} size="small" value={startColor} onChange={onStartColorChange} fullWidth placeholder="#9b2a77" />
            <Button variant="outlined" onClick={onApplyHeadingColor}>
              {applyStartLabel}
            </Button>
          </Stack>

          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              component="input"
              type="color"
              value={endColor}
              onChange={onEndColorChange}
              sx={{
                width: 42,
                height: 42,
                border: 'none',
                p: 0,
                bgcolor: 'transparent',
                cursor: 'pointer',
              }}
            />
            <TextField label={endLabel} size="small" value={endColor} onChange={onEndColorChange} fullWidth placeholder="#57c785" />
            <Button variant="outlined" onClick={onApplyAccentColor}>
              {applyEndLabel}
            </Button>
          </Stack>
        </Stack>

        <Stack spacing={0.8}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Current applied colors
          </Typography>
          <Stack direction="row" spacing={1}>
            <Box
              sx={{
                flex: 1,
                p: 1,
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: headingColor || 'transparent',
                minHeight: 36,
              }}
            />
            <Box
              sx={{
                flex: 1,
                p: 1,
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: accentColor || 'transparent',
                minHeight: 36,
              }}
            />
          </Stack>
        </Stack>
      </Stack>
    </Drawer>
  );
}
