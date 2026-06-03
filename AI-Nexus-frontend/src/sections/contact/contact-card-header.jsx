import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import {
  contactCardHeaderSx,
  contactCardSubtitleSx,
  contactCardTitleSx,
} from './contact-card-styles';

// ----------------------------------------------------------------------

function renderTitleWithHighlight(title, highlight) {
  const trimmedTitle = String(title || '').trim();
  const trimmedHighlight = String(highlight || '').trim();

  if (!trimmedTitle || !trimmedHighlight) {
    return trimmedTitle;
  }

  const lowerTitle = trimmedTitle.toLowerCase();
  const lowerHighlight = trimmedHighlight.toLowerCase();
  const startIndex = lowerTitle.indexOf(lowerHighlight);

  if (startIndex === -1) {
    return trimmedTitle;
  }

  const before = trimmedTitle.slice(0, startIndex);
  const match = trimmedTitle.slice(startIndex, startIndex + trimmedHighlight.length);
  const after = trimmedTitle.slice(startIndex + trimmedHighlight.length);

  return (
    <>
      {before}
      <Box component="span" sx={{ color: 'primary.main' }}>
        {match}
      </Box>
      {after}
    </>
  );
}

export function ContactCardHeader({ title = '', subtitle = '', titleHighlight = '' }) {
  if (!title && !subtitle) {
    return null;
  }

  return (
    <Box sx={contactCardHeaderSx}>
      {title ? (
        <Typography variant="h5" sx={contactCardTitleSx}>
          {renderTitleWithHighlight(title, titleHighlight)}
        </Typography>
      ) : null}
      {subtitle ? (
        <Typography variant="body2" sx={contactCardSubtitleSx}>
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}
