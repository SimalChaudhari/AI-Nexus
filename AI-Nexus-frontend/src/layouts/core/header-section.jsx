import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import { styled, useTheme } from '@mui/material/styles';

import { useScrollOffSetTop } from 'src/hooks/use-scroll-offset-top';

import { bgBlur, varAlpha } from 'src/theme/styles';

import { layoutClasses } from '../classes';

// ----------------------------------------------------------------------

const StyledElevation = styled('span')(({ theme }) => ({
  left: 0,
  right: 0,
  bottom: 0,
  m: 'auto',
  height: 24,
  zIndex: -1,
  opacity: 0.48,
  borderRadius: '50%',
  position: 'absolute',
  width: `calc(100% - 48px)`,
  boxShadow: theme.customShadows.z8,
}));

// ----------------------------------------------------------------------

export function HeaderSection({
  sx,
  slots,
  slotProps,
  disableOffset,
  disableElevation,
  offsetSx,
  disableAppBar = false,
  appBarPosition = 'sticky',
  layoutQuery = 'md',
  compressCenterWhenEmpty = false,
  ...other
}) {
  const theme = useTheme();

  const { offsetTop } = useScrollOffSetTop();
  const usePlainHeader = disableAppBar;

  const toolbarStyles = {
    default: {
      minHeight: 'auto',
      height: 'var(--layout-header-mobile-height)',
      [theme.breakpoints.up('sm')]: {
        minHeight: 'auto',
      },
      [theme.breakpoints.up(layoutQuery)]: {
        height: 'var(--layout-header-desktop-height)',
      },
    },
    offset: {
      ...bgBlur({
        color: varAlpha(theme.vars.palette.background.defaultChannel, 0.8),
      }),
    },
  };

  const rootSx = {
    zIndex: 'var(--layout-header-zIndex)',
    ...sx,
  };

  return (
    <Box
      className={layoutClasses.header}
      sx={rootSx}
      data-offset-top={offsetTop ? 'true' : 'false'}
      component={usePlainHeader ? 'header' : AppBar}
      {...(!usePlainHeader && { position: appBarPosition })}
      {...other}
    >
      {slots?.topArea}

      <Toolbar
        disableGutters
        {...slotProps?.toolbar}
        sx={{
          ...toolbarStyles.default,
          ...(!disableOffset && offsetTop && toolbarStyles.offset),
          ...(!disableOffset && offsetTop && offsetSx),
          ...slotProps?.toolbar?.sx,
        }}
      >
        <Container
          {...slotProps?.container}
          maxWidth={false}
          sx={{
            height: 1,
            display: 'flex',
            alignItems: 'center',
            ...slotProps?.container?.sx,
          }}
        >
          {slots?.leftArea}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              flex:
                slots?.centerArea || !compressCenterWhenEmpty ? '1 1 auto' : '0 0 auto',
              width:
                slots?.centerArea || !compressCenterWhenEmpty ? 'auto' : 0,
            }}
          >
            {slots?.centerArea}
          </Box>

          {slots?.rightArea}
        </Container>
      </Toolbar>

      {slots?.bottomArea}

      {!disableAppBar && !disableElevation && offsetTop && <StyledElevation />}
    </Box>
  );
}
