"use client";

import * as React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Footer from './footer';

import type { NavItemConfig } from '@/types/nav';
import { MainNav } from '@/components/dashboard/layout/main-nav';
import { SideNav } from '@/components/dashboard/layout/side-nav';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: LayoutProps): React.JSX.Element {
  const [pageTitle, setPageTitle] = React.useState("");
  const [uptimeKey, setUptimeKey] = React.useState(0);
  const { t } = useTranslation();

  function handleActiveItem(item: NavItemConfig): void {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Expected
    React.useEffect(() => {
      if (item.title) {
        setPageTitle(t(item.title));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected
    }, [t, item.title]);
  }

  const handleRestarted = React.useCallback((): void => {
    setUptimeKey((k) => k + 1);
  }, []);

  return (
    <Box
      sx={{
        bgcolor: 'var(--mui-palette-background-default)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minHeight: '100%',
      }}
    >
      <SideNav onActiveItem={handleActiveItem} uptimeKey={uptimeKey} />
      <Box sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', pl: { lg: 'var(--SideNav-width)' } }}>
        <MainNav pageTitle={pageTitle} onRestarted={handleRestarted} />
        <Container maxWidth={false} sx={{ py: '32px' }}>
          {children}
        </Container>
        <Footer />
      </Box>
    </Box>
  );
}
