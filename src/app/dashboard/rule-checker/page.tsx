"use client";

import * as React from 'react';
import Stack from '@mui/material/Stack';

import { config } from '@/config';
import { CheckDomainRulePanel } from '@/components/dashboard/settings/check-domain-rule-panel';
import { useTranslation } from 'react-i18next';

export default function Page(): React.JSX.Element {
  const { t } = useTranslation();

  React.useEffect(() => {
    document.title = `${t('Rule Checker')} | ${t('Dashboard')} | ${config.site.name}`;
  }, [t]);

  return (
    <Stack spacing={3}>
      <CheckDomainRulePanel />
    </Stack>
  );
}
