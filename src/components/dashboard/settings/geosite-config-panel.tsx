"use client";

import * as React from "react";
import Stack from "@mui/material/Stack";
import {
	Alert,
	Button,
	Card,
	CardActions,
	CardContent,
	Chip,
	Divider,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	type SelectChangeEvent,
	Typography,
} from "@mui/material";
import { ConfigEditor } from "@/components/common/config-editor";
import { mockGeositeContent, mockGeositeFiles } from "@/lib/mock/config-data";
import { SaveOutlined, RefreshOutlined } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/default-logger";

export function GeositeConfigPanel(): React.JSX.Element {
	const { t } = useTranslation();
	const [selectedFile, setSelectedFile] = React.useState<string>(mockGeositeFiles[0]?.name ?? "");
	const [content, setContent] = React.useState<string>(mockGeositeContent[mockGeositeFiles[0]?.name] ?? "");
	const [saved, setSaved] = React.useState(false);
	const [error, setError] = React.useState("");

	const handleFileChange = React.useCallback(
		(event: SelectChangeEvent) => {
			const name = event.target.value;
			setSelectedFile(name);
			const fileContent = mockGeositeContent[name] ?? `# ${name}\n# No content available\n`;
			setContent(fileContent);
			setSaved(false);
			setError("");
		},
		[],
	);

	const currentFile = mockGeositeFiles.find((f) => f.name === selectedFile);

	const handleSave = React.useCallback(async () => {
		// TODO: Call backend API to save geosite file
		logger.debug(`[GeositeConfig] Save ${selectedFile} triggered (mock)`);
		setError("");
		setSaved(true);
		setTimeout(() => setSaved(false), 3000);
	}, [selectedFile]);

	const handleReset = React.useCallback(() => {
		const fileContent = mockGeositeContent[selectedFile] ?? `# ${selectedFile}\n# No content available\n`;
		setContent(fileContent);
		setSaved(false);
		setError("");
	}, [selectedFile]);

	const isModified = content !== (mockGeositeContent[selectedFile] ?? "");

	return (
		<Card>
			<CardContent>
				<Stack spacing={2} sx={{ mb: 2 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						{t("Geosite Data Files")}
					</Typography>
					<Stack spacing={2} direction="row" alignItems="center">
						<FormControl size="small" sx={{ minWidth: 240 }}>
							<InputLabel>{t("Select file...")}</InputLabel>
							<Select value={selectedFile} label={t("Select file...")} onChange={handleFileChange}>
								{mockGeositeFiles.map((file) => (
									<MenuItem key={file.name} value={file.name}>
										{file.name}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						{currentFile && (
							<Stack spacing={1} direction="row" alignItems="center">
								<Chip
									label={currentFile.source === "local" ? t("Local") : t("Remote")}
									size="small"
									color={currentFile.source === "local" ? "success" : "warning"}
									variant="outlined"
								/>
								<Typography variant="caption" color="text.secondary" sx={{ maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
									{currentFile.path}
								</Typography>
							</Stack>
						)}
						<Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
							{content.split("\n").length} {t("lines")}
						</Typography>
					</Stack>
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
				<Button startIcon={<RefreshOutlined />} onClick={handleReset} disabled={!isModified}>
					{t("Reset")}
				</Button>
				<Button startIcon={<SaveOutlined />} variant="contained" onClick={handleSave}>
					{t("Save")}
				</Button>
			</CardActions>
		</Card>
	);
}
