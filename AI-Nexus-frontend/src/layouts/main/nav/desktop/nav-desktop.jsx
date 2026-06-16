import Stack from '@mui/material/Stack';

import { NavUl } from 'src/components/nav-section';

import { NavList } from './nav-desktop-list';
import { NARROW_DESKTOP_NAV } from './nav-desktop.constants';

export function NavDesktop({ data, sx }) {
  return (
    <Stack component="nav" sx={{ height: 1, ...sx }}>
      <NavUl
        sx={{
          gap: { md: 2.5, lg: 3.5 },
          [NARROW_DESKTOP_NAV]: {
            gap: 1.5,
            flexWrap: 'nowrap',
          },
          height: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        {data.map((list) => (
          <NavList key={list.title} data={list} />
        ))}
      </NavUl>
    </Stack>
  );
}
