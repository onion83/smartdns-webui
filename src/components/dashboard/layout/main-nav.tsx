'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { MobileNav } from './mobile-nav';
import { MainToolBar } from './main-toolbar';
import { ServerUptime } from './server-uptime';
import { Typography } from '@mui/material';
import { MenuOutlined } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

interface MainNavProps {
  pageTitle: string;
  onRestarted?: () => void;
}

export function MainNav({ pageTitle, onRestarted }: MainNavProps): React.JSX.Element {
  const [openNav, setOpenNav] = React.useState<boolean>(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  return (
    <React.Fragment>
      <Box
        component="header"
        sx={{
          color: 'var(--mui-palette-toolbar-title-color)',
          borderBottom: '1px solid var(--mui-palette-divider)',
          backgroundColor: 'var(--mui-palette-toolbar-title-background)',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--mui-zIndex-appBar)',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '64px',
            px: 2,
            overflow: 'hidden',
          }}
        >
          <Stack sx={{ alignItems: 'center', minWidth: 0, flex: '0 1 auto' }} direction="row" spacing={2}>
            <IconButton
              onClick={(): void => {
                setOpenNav(true);
              }}
              sx={{ display: { lg: 'none' }, flexShrink: 0 }}
            >
              <MenuOutlined />
            </IconButton>
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="h5" noWrap>
                {pageTitle}
              </Typography>
            </Stack>
          </Stack>
          <Box
            component="span"
            sx={{
              display: { xs: 'block', lg: 'none' },
              flexShrink: 0,
            }}
          >
            <ServerUptime />
          </Box>
          <Box
            sx={{
              display: isMobile ? 'inline-flex' : 'flex',
              alignItems: 'center',
              maxWidth: isMobile ? '110px' : undefined,
              minWidth: isMobile ? 'auto' : undefined,
              overflowX: isMobile ? 'scroll' : 'visible',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              flexShrink: 0,
            }}
          >
            <MainToolBar onRestarted={onRestarted} />
          </Box>
        </Stack>
      </Box>
      <MobileNav
        onClose={() => {
          setOpenNav(false);
        }}
        open={openNav}
        OnClickItem={() => {
          setOpenNav(false);
        }}
      />
    </React.Fragment>
  );
}
