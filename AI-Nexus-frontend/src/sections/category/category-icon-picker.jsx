import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';

// ----------------------------------------------------------------------

export function CategoryIconPicker({ value, onChange }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Remove duplicates using Set and filter icons
  const uniqueIcons = useMemo(() => [...new Set(categoryIcons)], []);

  const filteredIcons = useMemo(
    () =>
      uniqueIcons.filter((icon) =>
        icon.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [uniqueIcons, searchQuery]
  );

  const handleIconSelect = (iconName) => {
    onChange(iconName);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        Icon
      </Typography>

      <TextField
        fullWidth
        placeholder="Search icons..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {value && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
            Selected Icon:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Iconify icon={value} width={32} />
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {value}
            </Typography>
          </Box>
        </Box>
      )}

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          maxHeight: 400,
          overflow: 'auto',
          bgcolor: 'background.neutral',
        }}
      >
        <Box
          display="grid"
          gridTemplateColumns={{
            xs: 'repeat(4, 1fr)',
            sm: 'repeat(6, 1fr)',
            md: 'repeat(8, 1fr)',
          }}
          gap={1}
        >
          {filteredIcons.map((icon) => (
            <IconButton
              key={icon}
              onClick={() => handleIconSelect(icon)}
              sx={{
                width: 56,
                height: 56,
                border: value === icon ? 2 : 1,
                borderColor: value === icon ? 'primary.main' : 'divider',
                bgcolor: value === icon ? 'primary.lighter' : 'background.paper',
                '&:hover': {
                  bgcolor: value === icon ? 'primary.lighter' : 'action.hover',
                },
              }}
              title={icon}
            >
              <Iconify icon={icon} width={24} />
            </IconButton>
          ))}
        </Box>

        {filteredIcons.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No icons found matching &quot;{searchQuery}&quot;
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

