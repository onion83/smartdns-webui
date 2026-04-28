"use client";

import * as React from "react";
import Stack from "@mui/material/Stack";
import { Alert, Button, Card, CardActions, CardContent, Chip, Divider, Typography } from "@mui/material";
import { ConfigEditor } from "@/components/common/config-editor";
import { mockSmartdnsConf } from "@/lib/mock/config-data";
import { SaveOutlined, RefreshOutlined } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/default-logger";

export function MainConfigPanel(): React.JSX.Element {
	const { t } = useTranslation();
	const [content, setContent] = React.useState(mockSmartdnsConf);
	const [saved, setSaved] = React.useState(false);
	const [error, setError] = React.useState("");
	const contentRef = React.useRef(content);

	React.useEffect(() => {
		contentRef.current = content;
	}, [content]);

	const handleSave = React.useCallback(async () => {
		// TODO: Call backend API to save config
		// const configContent = contentRef.current;
		// const { error } = await smartdnsServer.SaveConfigFile("smartdns.conf", configContent);
		logger.debug("[MainConfig] Save triggered (mock)");
		setError("");
		setSaved(true);
		setTimeout(() => setSaved(false), 3000);
	}, []);

	const handleReset = React.useCallback(() => {
		setContent(mockSmartdnsConf);
		setSaved(false);
		setError("");
	}, []);

	return (
		<Card>
			<CardContent>
				<Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 1 }}>
					<Chip label="smartdns.conf" size="small" variant="outlined" color="primary" />
					<Chip label={t("Main Config")} size="small" color="info" />
					<Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
						{content.split("\n").length} {t("lines")}
					</Typography>
				</Stack>
				<Divider sx={{ mb: 2 }} />
				<ConfigEditor content={content} onChange={setContent} />
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
				<Button startIcon={<RefreshOutlined />} onClick={handleReset} disabled={content === mockSmartdnsConf}>
					{t("Reset")}
				</Button>
				<Button startIcon={<SaveOutlined />} variant="contained" onClick={handleSave}>
					{t("Save")}
				</Button>
			</CardActions>
		</Card>
	);
}
