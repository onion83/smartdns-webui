import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';

import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { useUser } from '@/hooks/use-user';
import { DarkModeSwitch } from '@/components/common/darkmode-switch';
import { LogoutOutlined, RestartAlt } from '@mui/icons-material';
import { smartdnsServer } from '@/lib/backend/server';
import { useTranslation } from 'react-i18next';

interface MainToolBarProps {
	onRestarted?: () => void;
}

export function MainToolBar({ onRestarted }: MainToolBarProps): React.JSX.Element {
	const { checkSession } = useUser();
	const router = useRouter();
	const { t } = useTranslation();

	const handleSignOut = React.useCallback(async (): Promise<void> => {
		try {
			const { error } = await authClient.signOut();

			if (error) {
				logger.error('Sign out error', error);
				return;
			}

			await checkSession?.();

			router.refresh();
		} catch (error) {
			logger.error('Sign out error', error);
		}
	}, [checkSession, router]);

	const handleRestart = React.useCallback(async (): Promise<void> => {
		try {
			const { error } = await smartdnsServer.RestartServer();
			if (error) {
				logger.error('Restart server error', error);
				return;
			}
			onRestarted?.();
		} catch (error) {
			logger.error('Restart server error', error);
		}
	}, [onRestarted]);

	return (
		<Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
			<Box sx={{ flexShrink: 0 }}>
				<DarkModeSwitch />
			</Box>
			<Tooltip title={t('Restart Server')}>
				<IconButton onClick={handleRestart} sx={{ flexShrink: 0 }}>
					<RestartAlt />
				</IconButton>
			</Tooltip>
			<Tooltip title={t('Sign out')}>
				<IconButton
					onClick={async (): Promise<void> => {
						await handleSignOut();
					}}
					sx={{ flexShrink: 0 }}
				>
					<LogoutOutlined />
				</IconButton>
			</Tooltip>
		</Stack>
	);
}
