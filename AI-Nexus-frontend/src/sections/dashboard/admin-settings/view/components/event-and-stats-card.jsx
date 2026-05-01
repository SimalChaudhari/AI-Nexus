import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import EmojiPicker from 'emoji-picker-react';

/**
 * Event + stats card for hero content.
 * Includes emoji picker drawer and stat add/remove controls.
 */
export function EventAndStatsCard({
  heroContent,
  updateHeroEventField,
  updateHeroStat,
  visibleStatsCount,
  addVisibleStatRow,
  removeVisibleStatRow,
  emojiPickerStatIndex,
  openEmojiPicker,
  closeEmojiPicker,
  chooseStatEmoji,
}) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Event window and hero stats
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Configure one event block and up to three stats shown on the hero section.
          </Typography>
        </Box>

        <Typography variant="subtitle2" color="text.secondary">
          Event details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Date label"
              value={heroContent?.event?.startDateLabel || ''}
              onChange={(e) => updateHeroEventField('startDateLabel', e.target.value)}
              fullWidth
              placeholder="e.g. Date"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Date"
              value={heroContent?.event?.startDate || ''}
              onChange={(e) => updateHeroEventField('startDate', e.target.value)}
              fullWidth
              placeholder="2026-05-01"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Time label"
              value={heroContent?.event?.startTimeLabel || ''}
              onChange={(e) => updateHeroEventField('startTimeLabel', e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Time"
              value={heroContent?.event?.startTime || ''}
              onChange={(e) => updateHeroEventField('startTime', e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Stats (up to 3)
          </Typography>
          <Button variant="outlined" onClick={addVisibleStatRow} disabled={visibleStatsCount >= 3}>
            Add stats
          </Button>
        </Stack>
        {[0, 1, 2].slice(0, visibleStatsCount).map((i) => (
          <Grid container spacing={2} key={`hero-stat-${i}`}>
            <Grid item xs={12} sm={8}>
              <TextField
                label={`Stat ${i + 1} label`}
                value={heroContent.stats[i]?.label || ''}
                onChange={(e) => updateHeroStat(i, 'label', e.target.value)}
                fullWidth
                placeholder={i === 0 ? 'e.g. Course rating' : ''}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button size="small" variant="text" onClick={() => openEmojiPicker(i)} sx={{ minWidth: 0, px: 0.75 }}>
                        {heroContent.stats[i]?.icon || '🙂'}
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        variant="text"
                        onClick={() => updateHeroStat(i, 'icon', '')}
                        disabled={!heroContent.stats[i]?.icon}
                        sx={{ minWidth: 0, px: 0.5 }}
                      >
                        x
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label={`Stat ${i + 1} value`}
                  value={heroContent.stats[i]?.value || ''}
                  onChange={(e) => updateHeroStat(i, 'value', e.target.value)}
                  fullWidth
                  placeholder={i === 0 ? 'e.g. 4.9' : ''}
                />
                {visibleStatsCount > 1 && (
                  <Button color="inherit" onClick={() => removeVisibleStatRow(i)}>
                    Remove
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        ))}

        <Drawer
          anchor="right"
          open={emojiPickerStatIndex != null}
          onClose={closeEmojiPicker}
          PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 2 } }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6">Select stat emoji</Typography>
            <Button color="inherit" onClick={closeEmojiPicker}>
              Close
            </Button>
          </Stack>
          <EmojiPicker
            width="100%"
            height={520}
            onEmojiClick={(emojiData) => chooseStatEmoji(emojiData.emoji)}
            previewConfig={{ showPreview: false }}
          />
        </Drawer>
      </Stack>
    </Card>
  );
}
