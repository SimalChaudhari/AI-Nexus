import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';

import { Iconify } from 'src/components/iconify';
import { Editor } from 'src/components/editor';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { CEO_LAUNCH_STATS_MAX } from 'src/sections/home/ceo-launch-defaults';
import { HeroImageCard } from './hero-image-card';
import { CeoLaunchVideoField } from './ceo-launch-video-field';

export function CeoLaunchSettingsCard({
  content,
  setContent,
  submitting,
  onSave,
  posterFile,
  posterUrl,
  posterSubmitting,
  onPosterDrop,
  onPosterDelete,
  onPosterSave,
  onPosterClearOrRemove,
  videoFile,
  videoSubmitting,
  onVideoFileSelect,
  onVideoClearPending,
  onVideoSave,
  onVideoRemoveUploaded,
  onVideoRemoveAll,
}) {
  const stats = Array.isArray(content?.stats) ? content.stats : [];

  const updateStat = (index, field, value) => {
    setContent((prev) => {
      const rows = [...(Array.isArray(prev.stats) ? prev.stats : [])];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, stats: rows };
    });
  };

  const addStat = () => {
    if (stats.length >= CEO_LAUNCH_STATS_MAX) return;
    setContent((prev) => ({
      ...prev,
      stats: [...(Array.isArray(prev.stats) ? prev.stats : []), { value: '', label: '' }],
    }));
  };

  const removeStat = (index) => {
    setContent((prev) => ({
      ...prev,
      stats: (Array.isArray(prev.stats) ? prev.stats : []).filter((_, i) => i !== index),
    }));
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
              CEO launch video
            </Typography>
            <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
              Dark home section — eyebrow, heading, video, quote, stats, and play CTA.
            </Typography>
          </Box>

          <TextField
            label="Eyebrow"
            value={content?.eyebrow || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, eyebrow: e.target.value }))}
            placeholder="CEO LAUNCH VIDEO"
            fullWidth
          />
          <TextField
            label="Heading"
            value={content?.heading || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, heading: e.target.value }))}
            placeholder="Why AI Fluency Matters Now"
            fullWidth
          />

          <Stack spacing={0.75}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Subtitle
            </Typography>
            <Editor
              value={content?.subtitle || ''}
              onChange={(value) => setContent((prev) => ({ ...prev, subtitle: value }))}
              sx={{ minHeight: 120 }}
            />
          </Stack>

          <CeoLaunchVideoField
            videoUrl={content?.videoUrl || ''}
            onVideoUrlChange={(value) => {
              setContent((prev) => ({ ...prev, videoUrl: value }));
              if (String(value || '').trim() && videoFile) onVideoClearPending();
            }}
            videoFile={videoFile}
            onVideoFileSelect={onVideoFileSelect}
            onClearPendingFile={onVideoClearPending}
            uploadedVideoUrl={content?.videoFileUrl || ''}
            videoSubmitting={videoSubmitting}
            contentSubmitting={submitting}
            onVideoSave={onVideoSave}
            onRemoveUploadedVideo={onVideoRemoveUploaded}
            onRemoveAllVideo={onVideoRemoveAll}
          />

          <TextField
            label="Quote"
            value={content?.quote || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, quote: e.target.value }))}
            multiline
            minRows={3}
            fullWidth
          />

          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Statistics ({stats.length}/{CEO_LAUNCH_STATS_MAX})
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={addStat}
                disabled={stats.length >= CEO_LAUNCH_STATS_MAX || submitting}
              >
                Add stat
              </Button>
            </Stack>
            {stats.map((row, index) => (
              <Grid container spacing={1.5} key={`ceo-stat-field-${index}`} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Value"
                    value={row?.value || ''}
                    onChange={(e) => updateStat(index, 'value', e.target.value)}
                    placeholder="78%"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={7}>
                  <TextField
                    label="Label"
                    value={row?.label || ''}
                    onChange={(e) => updateStat(index, 'label', e.target.value)}
                    placeholder="of companies adopting AI"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={1} sx={{ display: 'flex', justifyContent: { sm: 'center' } }}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeStat(index)}
                    disabled={submitting}
                    aria-label="Remove stat"
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
          </Stack>

          <TextField
            label="CTA label"
            value={content?.ctaLabel || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, ctaLabel: e.target.value }))}
            placeholder="Play CEO Message"
            fullWidth
          />
          <TextField
            label="CTA link (optional fallback if no video URL)"
            value={content?.ctaHref || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, ctaHref: e.target.value }))}
            fullWidth
          />

          <LoadingButton variant="contained" loading={submitting} onClick={() => onSave()} sx={{ alignSelf: 'flex-start' }}>
            Save CEO launch section
          </LoadingButton>
        </Stack>
      </Card>

      <HeroImageCard
        title="Video poster / thumbnail"
        description="Image shown behind the play button on the home page (CEO launch message)."
        saveLabel="Save poster image"
        heroFile={posterFile}
        heroUrl={posterUrl}
        heroSubmitting={posterSubmitting}
        onDrop={onPosterDrop}
        onDelete={onPosterDelete}
        onSave={onPosterSave}
        onClearOrRemove={onPosterClearOrRemove}
      />
    </Stack>
  );
}
