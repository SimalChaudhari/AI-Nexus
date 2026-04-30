import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import { useNavigate } from 'react-router-dom';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export function CartIcon({ totalItems }) {
  const navigate = useNavigate();
  const hasItems = totalItems > 0;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => {
        if (totalItems > 0) {
          navigate(paths.product.checkout);
          return;
        }
        toast.info('Cart is empty', {
          description: 'Add a course to continue checkout.',
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
          },
        });
      }}
      sx={{
        right: 0,
        top: 112,
        zIndex: 999,
        display: 'flex',
        cursor: 'pointer',
        position: 'fixed',
        color: 'text.primary',
        border: 'none',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
        bgcolor: 'background.paper',
        margin: 0,
        padding: (theme) => theme.spacing(1, 3, 1, 2),
        boxShadow: (theme) => theme.customShadows.dropdown,
        transition: 'none',
      }}
    >
      <Badge
        showZero
        badgeContent={totalItems}
        color="error"
        max={99}
        sx={{
          '& .MuiBadge-badge': {
            bgcolor: 'common.white',
            color: 'text.secondary',
            border: (theme) => `1px solid ${theme.palette.grey[300]}`,
            fontWeight: 700,
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: hasItems ? 'secondary.main' : 'warning.main',
            color: hasItems ? 'common.white' : 'warning.contrastText',
            borderRadius: '50%',
            p: 0.55,
            '&::after': undefined,
          }}
        >
          <Iconify icon="solar:cart-plus-bold" width={24} />
        </Box>
      </Badge>
    </Box>
  );
}
