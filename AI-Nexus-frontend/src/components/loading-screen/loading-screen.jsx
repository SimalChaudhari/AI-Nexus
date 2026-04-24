import Box from '@mui/material/Box';
import Portal from '@mui/material/Portal';
import { keyframes } from '@mui/system';

// ----------------------------------------------------------------------

export function LoadingScreen({ portal, sx, ...other }) {
  const content = (
    <Box
      sx={{
        px: 2,
        width: 1,
        flexGrow: 1,
        minHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'transparent',
        pointerEvents: 'none',
        ...sx,
      }}
      {...other}
    >
      <Loader size={104} />
    </Box>
  );

  if (portal) {
    return <Portal>{content}</Portal>;
  }

  return content;
}


export default function Loader({ className = '', size = 104 }) {
  const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  `;
  const spinReverse = keyframes`
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  `;
  const pulse = keyframes`
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
    50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
  `;

  return (
    <Box
      className={className}
      aria-label="Loading"
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'radial-gradient(circle, rgba(148,163,184,0.25) 30%, transparent 70%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '4px solid transparent',
            borderTopColor: 'primary.main',
            borderRightColor: 'secondary.main',
            animation: `${spin} 1s linear infinite`,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            inset: '10%',
            borderRadius: '50%',
            filter: 'blur(2px)',
            background: 'conic-gradient(from 90deg, rgba(15,23,42,0.25), transparent)',
            animation: `${spinReverse} 1.5s linear infinite`,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'secondary.main',
            boxShadow: (theme) => `0 0 18px ${theme.palette.secondary.main}99`,
            transform: 'translate(-50%, -50%)',
            animation: `${pulse} 1.2s ease-in-out infinite`,
          }}
        />

        <Box sx={{ position: 'absolute', inset: 0, animation: `${spin} 3s linear infinite` }}>
          {[0, 90, 180, 270].map((deg) => (
            <Box
              key={deg}
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: deg % 180 === 0 ? 'primary.main' : 'secondary.main',
                transform: `rotate(${deg}deg) translate(${Math.round(size * 0.38)}px)`,
              }}
            />
          ))}
        </Box>
      </Box>

      <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Loading
      </Box>
    </Box>
  );
}
