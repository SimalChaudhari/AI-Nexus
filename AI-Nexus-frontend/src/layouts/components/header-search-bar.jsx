import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function HeaderSearchBar({ sx, ...other }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        width: '100%',
        maxWidth: '100%',
        px: 2,
        ...sx,
      }}
      {...other}
    >
      <Box
        component="form"
        sx={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 2,
          border: `1px solid ${theme.vars.palette.divider}`,
          bgcolor: 'background.paper',
          '&:hover': {
            borderColor: theme.vars.palette.text.secondary,
          },
          '&:focus-within': {
            borderColor: theme.vars.palette.primary.main,
            boxShadow: `0 0 0 2px ${theme.vars.palette.primary.mainChannel}20`,
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 12,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            color: 'text.secondary',
          }}
        >
          <Iconify icon="eva:search-fill" width={20} />
        </Box>
        <InputBase
          placeholder="Search for anything"
          sx={{
            width: '100%',
            pl: 5,
            pr: 2,
            py: 1.25,
            typography: 'body2',
            '& .MuiInputBase-input': {
              '&::placeholder': {
                opacity: 0.6,
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}

