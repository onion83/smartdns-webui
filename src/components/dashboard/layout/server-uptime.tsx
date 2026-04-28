'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import { smartdnsServer } from '@/lib/backend/server';
import { useTranslation } from 'react-i18next';

function formatUptime(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0 || days > 0) parts.push(`${hours}h`);
	if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
	parts.push(`${seconds}s`);

	return parts.join(' ');
}

export function ServerUptime(): React.JSX.Element {
	const { t } = useTranslation();
	const [uptime, setUptime] = React.useState<string>('--');
	const startupRef = React.useRef<number | null>(null);
	const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

	React.useEffect(() => {
		let cancelled = false;

		async function fetchStartup() {
			const { data } = await smartdnsServer.GetOverView();
			if (cancelled || !data?.startup_timestamp) return;
			startupRef.current = data.startup_timestamp;

			const tick = () => {
				if (startupRef.current) {
					setUptime(formatUptime(Date.now() - startupRef.current));
				}
			};
			tick();
			timerRef.current = setInterval(tick, 1000);
		}

		fetchStartup();

		return () => {
			cancelled = true;
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, []);

	return (
		<Typography
			variant="body2"
			sx={{
				color: 'text.secondary',
				textAlign: 'center',
				fontVariantNumeric: 'tabular-nums',
				userSelect: 'none',
			}}
		>
			{t('UPTIME')}: {uptime}
		</Typography>
	);
}
