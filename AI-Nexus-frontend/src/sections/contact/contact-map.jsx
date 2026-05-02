import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function ContactMap({ contacts }) {
  const primaryContact = Array.isArray(contacts) && contacts.length > 0 ? contacts[0] : null;
  const latitude = Number(primaryContact?.latlng?.[0]);
  const longitude = Number(primaryContact?.latlng?.[1]);
  const hasLatLng = Number.isFinite(latitude) && Number.isFinite(longitude);
  const plainDetails = String(primaryContact?.details || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const mapQuery = hasLatLng
    ? `${latitude},${longitude}`
    : encodeURIComponent(plainDetails || 'Singapore');
  const iframeSrc = `https://maps.google.com/maps?q=${mapQuery}&z=12&output=embed`;

  return (
    <Box
      sx={{
        zIndex: 0,
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        boxShadow: (theme) => theme.customShadows.z8,
      }}
    >
  
      <Box
        sx={{
          borderRadius: 1.5,
          overflow: 'hidden',
          position: 'relative',
          height: { xs: 320, md: 560 },
          border: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.neutral',
        }}
      >
        <Box
          component="iframe"
          title="Contact location map"
          src={iframeSrc}
          width="100%"
          height="100%"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sx={{ border: 0 }}
        />
      </Box>

      {!!primaryContact && (
        <Stack spacing={0.75} sx={{ mt: 1.75 }}>
            {(plainDetails || hasLatLng) && (
            <Button
              size="small"
              variant="outlined"
              component="a"
              href={
                hasLatLng
                  ? `https://maps.google.com/?q=${latitude},${longitude}`
                  : `https://maps.google.com/?q=${encodeURIComponent(plainDetails)}`
              }
              target="_blank"
              rel="noreferrer"
              sx={{ alignSelf: 'flex-start' }}
            >
              Open in Google Maps
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}
