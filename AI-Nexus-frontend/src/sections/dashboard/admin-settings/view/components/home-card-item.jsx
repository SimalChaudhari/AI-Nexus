import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';

export function HomeCardItem({
  index,
  cardRow,
  canRemove,
  onRemove,
  onPickIcon,
  onTitleChange,
  onDescriptionChange,
  getDefaultCardIcon,
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        p: { xs: 1.5, md: 2 },
        borderRadius: 2,
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Stack spacing={1.8}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {`Card ${index + 1}`}
          </Typography>
          <Button color="error" variant="outlined" onClick={onRemove} disabled={!canRemove} size="small">
            Remove
          </Button>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField label="Title" value={cardRow?.title || ''} onChange={onTitleChange} fullWidth />

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.neutral',
                  width: { xs: '100%', md: 300 },
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 1.2,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon={cardRow?.icon || getDefaultCardIcon(index)} width={22} />
                </Box>
                <Button variant="outlined" onClick={onPickIcon} sx={{ flex: 1 }}>
                  Pick icon
                </Button>
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Stack spacing={0.75}>
              <Typography variant="subtitle2">Description</Typography>
              <Editor
                value={cardRow?.description || ''}
                onChange={onDescriptionChange}
                placeholder="Write card description..."
                editable
                slotProps={{
                  wrap: {
                    sx: {
                      minHeight: 170,
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    },
                  },
                }}
              />
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Card>
  );
}
