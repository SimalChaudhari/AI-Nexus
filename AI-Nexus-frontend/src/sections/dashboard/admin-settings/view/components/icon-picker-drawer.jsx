import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

export function IconPickerDrawer({
  open,
  onClose,
  contextLabel = 'selected item',
  searchQuery,
  onSearchQueryChange,
  filteredIcons,
  selectedIcon,
  onSelectIcon,
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 2.5 } }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Icon Picker</Typography>
          <Button color="inherit" onClick={onClose}>
            Close
          </Button>
        </Stack>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Choose icon from category menu list for {contextLabel}.
        </Typography>

        <TextField
          fullWidth
          placeholder="Search icons..."
          value={searchQuery}
          onChange={onSearchQueryChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            maxHeight: { xs: 420, sm: 520 },
            overflow: 'auto',
            bgcolor: 'background.neutral',
          }}
        >
          <Box
            display="grid"
            gridTemplateColumns={{
              xs: 'repeat(4, 1fr)',
              sm: 'repeat(6, 1fr)',
            }}
            gap={1}
          >
            {filteredIcons.map((iconName) => (
              <IconButton
                key={`home-card-icon-${iconName}`}
                onClick={() => onSelectIcon(iconName)}
                sx={{
                  width: 54,
                  height: 54,
                  border: selectedIcon === iconName ? 2 : 1,
                  borderColor: selectedIcon === iconName ? 'primary.main' : 'divider',
                  bgcolor: selectedIcon === iconName ? 'primary.lighter' : 'background.paper',
                }}
                title={iconName}
              >
                <Iconify icon={iconName} width={22} />
              </IconButton>
            ))}
          </Box>

          {filteredIcons.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No icons found for &quot;{searchQuery}&quot;
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Drawer>
  );
}
