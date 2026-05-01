import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

/**
 * Reusable color field with preset color chips.
 * Can be reused in any admin settings form where palette + manual hex input is needed.
 */
export function ColorPaletteField({
  label,
  value,
  onChange,
  presets = [],
  onOpenGenerator,
  generatorLabel = 'Generate Color',
}) {
  const current = String(value || '').trim();

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{label}</Typography>
      <TextField
        size="small"
        fullWidth
        value={current}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#1e88e5"
      />
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {presets.map((hex) => {
          const active = current.toLowerCase() === hex.toLowerCase();
          return (
            <Button
              key={hex}
              onClick={() => onChange(hex)}
              sx={{
                minWidth: 0,
                width: 28,
                height: 28,
                p: 0,
                borderRadius: '50%',
                bgcolor: hex,
                border: (theme) =>
                  `2px solid ${active ? theme.palette.common.black : theme.palette.common.white}`,
                boxShadow: (theme) => `0 0 0 1px ${theme.palette.divider}`,
                '&:hover': { bgcolor: hex, opacity: 0.9 },
              }}
            />
          );
        })}
      </Stack>
      <Stack direction="row" spacing={1}>
        {onOpenGenerator && (
          <Button size="small" variant="contained" onClick={onOpenGenerator}>
            {generatorLabel}
          </Button>
        )}
        <Button color="inherit" size="small" variant="outlined" onClick={() => onChange('')}>
          Clear
        </Button>
      </Stack>
      <Box
        sx={{
          width: 52,
          height: 18,
          borderRadius: 1,
          bgcolor: current || 'transparent',
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      />
    </Stack>
  );
}
