"use client";

import * as React from 'react';
import Stack from '@mui/material/Stack';

import { config } from '@/config';
import { GeositeConfigPanel } from '@/components/dashboard/settings/geosite-config-panel';
import { useTranslation } from 'react-i18next';

export default function Page(): React.JSX.Element {
  const { t } = useTranslation();

  React.useEffect(() => {
    document.title = `${t('Geosite Maintenance')} | ${t('Dashboard')} | ${config.site.name}`;
  }, [t]);

  return (
    <Stack spacing={3}>
      <GeositeConfigPanel />
    </Stack>
  );
}
