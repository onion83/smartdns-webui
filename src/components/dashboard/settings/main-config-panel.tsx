"use client";

import * as React from "react";
import Stack from "@mui/material/Stack";
import { Alert, Button, Card, CardActions, CardContent, Chip, CircularProgress, Divider, Typography } from "@mui/material";
import { ConfigEditor } from "@/components/common/config-editor";
import { smartdnsServer } from "@/lib/backend/server";
import { SaveOutlined, RefreshOutlined } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/default-logger";

export function MainConfigPanel(): React.JSX.Element {
	const { t } = useTranslation();
	const [content, setContent] = React.useState("");
	const [originalContent, setOriginalContent] = React.useState("");
	const [saved, setSaved] = React.useState(false);
	const [error, setError] = React.useState("");
	const [loading, setLoading] = React.useState(true);
	const [saving, setSaving] = React.useState(false);
	const contentRef = React.useRef(content);

	React.useEffect(() => {
		contentRef.current = content;
	}, [content]);

	React.useEffect(() => {
		let cancelled = false;
		const loadConfig = async () => {
			setLoading(true);
			setError("");
			const { error, data } = await smartdnsServer.GetConfigFile("smartdns.conf");
			if (cancelled) return;
			if (error || !data) {
				setError(error?.toString() ?? t("Failed to load configuration file"));
				setLoading(false);
				return;
			}
			setContent(data.content);
			setOriginalContent(data.content);
			setLoading(false);
		};
		loadConfig();
		return () => {
			cancelled = true;
		};
	}, []);

	const handleSave = React.useCallback(async () => {
		setSaving(true);
		setError("");
		const configContent = contentRef.current;
		const { error } = await smartdnsServer.SaveConfigFile("smartdns.conf", configContent);
		setSaving(false);
		if (error) {
			setError(error?.toString() ?? t("Failed to save configuration"));
			return;
		}
		setOriginalContent(configContent);
		setSaved(true);
		setTimeout(() => setSaved(false), 3000);
	}, []);

	const handleReset = React.useCallback(() => {
		setContent(originalContent);
		setSaved(false);
		setError("");
	}, [originalContent]);

	const isModified = content !== originalContent;

	return (
		<Card>
			<CardContent>
				<Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 1 }}>
					<Chip label="smartdns.conf" size="small" variant="outlined" color="primary" />
					<Chip label={t("Main Config")} size="small" color="info" />
					{!loading && (
						<Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
							{content.split("\n").length} {t("lines")}
						</Typography>
					)}
				</Stack>
				<Divider sx={{ mb: 2 }} />
				{loading ? (
					<Stack sx={{ height: 400, alignItems: "center", justifyContent: "center" }}>
						<CircularProgress size={32} />
					</Stack>
				) : (
					<ConfigEditor content={content} onChange={setContent} />
				)}
			</CardContent>
			{error && (
				<Alert severity="error" sx={{ mx: 2 }}>
					{error}
				</Alert>
			)}
			{saved && (
				<Alert severity="success" sx={{ mx: 2 }}>
					{t("Configuration saved successfully.")}
				</Alert>
			)}
			<Divider />
			<CardActions sx={{ justifyContent: "flex-end", px: 2 }}>
				<Button startIcon={<RefreshOutlined />} onClick={handleReset} disabled={loading || !isModified}>
					{t("Reset")}
				</Button>
				<Button startIcon={<SaveOutlined />} variant="contained" onClick={handleSave} disabled={loading || saving || !isModified}>
					{t("Save")}
				</Button>
			</CardActions>
		</Card>
	);
}
