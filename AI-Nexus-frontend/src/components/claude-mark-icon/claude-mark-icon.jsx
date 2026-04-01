import Box from '@mui/material/Box';

// Stylized Claude-style sunburst (organic radiating strokes, terracotta) — not an official asset.
const STROKES = [
  { x2: 12, y2: 2.2, w: 2.5 },
  { x2: 17.2, y2: 4.1, w: 2.8 },
  { x2: 20.6, y2: 8.4, w: 2.3 },
  { x2: 21.4, y2: 13.8, w: 2.9 },
  { x2: 19.1, y2: 18.9, w: 2.4 },
  { x2: 14.2, y2: 21.6, w: 2.7 },
  { x2: 8.5, y2: 21.2, w: 2.5 },
  { x2: 4.2, y2: 17.5, w: 2.8 },
  { x2: 2.6, y2: 12.1, w: 2.3 },
  { x2: 3.8, y2: 6.6, w: 2.6 },
  { x2: 7.6, y2: 3.2, w: 2.7 },
];

/**
 * Claude-inspired mark: hand-drawn sunburst look, uses `currentColor` (default terracotta).
 */
export function ClaudeMarkIcon({ width = 24, sx, ...other }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      sx={{
        width,
        height: width,
        flexShrink: 0,
        display: 'inline-flex',
        color: '#D97757',
        ...sx,
      }}
      aria-hidden
      {...other}
    >
      {STROKES.map((s, i) => (
        <line
          key={i}
          x1="12"
          y1="12"
          x2={s.x2}
          y2={s.y2}
          stroke="currentColor"
          strokeWidth={s.w}
          strokeLinecap="round"
        />
      ))}
    </Box>
  );
}
