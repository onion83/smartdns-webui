"use client";

import * as React from "react";
import Stack from "@mui/material/Stack";
import { Alert, Button, Card, CardActions, CardContent, Chip, CircularProgress, Divider, Typography } from "@mui/material";
import { ConfigEditor } from "@/components/common/config-editor";
import { smartdnsServer, type ConfigFileData, type ServerError } from "@/lib/backend/server";
import { SaveOutlined, RefreshOutlined } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			gcTime: 0,
			retry: false,
		},
	},
});

const CONFIG_QUERY_KEY = ["config", "smartdns.conf"];

function MainConfigPanelInner(): React.JSX.Element {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data, isLoading, error: queryError } = useQuery({
		queryKey: CONFIG_QUERY_KEY,
		queryFn: () => smartdnsServer.GetConfigFile("smartdns.conf"),
	});

	const serverContent = data?.data?.content ?? "";
	const [content, setContent] = React.useState("");
	const [saving, setSaving] = React.useState(false);
	const [saved, setSaved] = React.useState(false);
	const [saveError, setSaveError] = React.useState("");

	React.useEffect(() => {
		if (serverContent) {
			setContent(serverContent);
		}
	}, [serverContent]);

	const isModified = content !== serverContent;

	const handleSave = React.useCallback(async () => {
		setSaving(true);
		setSaveError("");
		const { error } = await smartdnsServer.SaveConfigFile("smartdns.conf", content);
		setSaving(false);
		if (error) {
			setSaveError(error?.toString() ?? t("Failed to save configuration"));
			return;
		}
		// Update the query cache so serverContent matches current content
		queryClient.setQueryData<{ error?: ServerError; data?: ConfigFileData | null }>(CONFIG_QUERY_KEY, (old) => {
			if (!old?.data) return old;
			return { ...old, data: { ...old.data, content } };
		});
		setSaved(true);
		setTimeout(() => setSaved(false), 3000);
	}, [content, queryClient, t]);

	const handleReset = React.useCallback(() => {
		setContent(serverContent);
		setSaved(false);
		setSaveError("");
	}, [serverContent]);

	return (
		<Card>
			<CardContent>
				<Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 1 }}>
					<Chip label="smartdns.conf" size="small" variant="outlined" color="primary" />
					<Chip label={t("Main Config")} size="small" color="info" />
					{!isLoading && content && (
						<Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
							{content.split("\n").length} {t("lines")}
						</Typography>
					)}
				</Stack>
				<Divider sx={{ mb: 2 }} />
				{isLoading ? (
					<Stack sx={{ height: 400, alignItems: "center", justifyContent: "center" }}>
						<CircularProgress size={32} />
					</Stack>
				) : content ? (
					<ConfigEditor content={content} onChange={setContent} />
				) : null}
			</CardContent>
			{(saveError || queryError) && (
				<Alert severity="error" sx={{ mx: 2 }}>
					{saveError || queryError?.message}
				</Alert>
			)}
			{saved && (
				<Alert severity="success" sx={{ mx: 2 }}>
					{t("Configuration saved successfully.")}
				</Alert>
			)}
			<Divider />
			<CardActions sx={{ justifyContent: "flex-end", px: 2 }}>
				<Button startIcon={<RefreshOutlined />} onClick={handleReset} disabled={isLoading || !isModified}>
					{t("Reset")}
				</Button>
				<Button startIcon={<SaveOutlined />} variant="contained" onClick={handleSave} disabled={isLoading || saving || !isModified}>
					{t("Save")}
				</Button>
			</CardActions>
		</Card>
	);
}

export function MainConfigPanel(): React.JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>
			<MainConfigPanelInner />
		</QueryClientProvider>
	);
}
