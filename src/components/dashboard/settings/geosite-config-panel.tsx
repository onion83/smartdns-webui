"use client";

import React, { useMemo } from "react";
import Stack from "@mui/material/Stack";
import {
	Alert,
	Box,
	Button,
	Card,
	CardActions,
	CardContent,
	Chip,
	CircularProgress,
	Divider,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	type SelectChangeEvent,
	Typography,
} from "@mui/material";
import { ConfigEditor } from "@/components/common/config-editor";
import { smartdnsServer, type GeositeFileInfo } from "@/lib/backend/server";
import { SaveOutlined, RefreshOutlined, CloudDownloadOutlined } from "@mui/icons-material";
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

const GEOSITE_LIST_KEY = ["geosite", "list"];
const geositeFileKey = (tag: string) => ["geosite", "file", tag];

/** Build 3-line header comment for the editor display */
function buildFileHeader(fileInfo?: { path: string; size: number; modified: string }): string {
	if (!fileInfo) return "";
	let localTime = fileInfo.modified;
	if (fileInfo.modified.endsWith("Z")) {
		const d = new Date(fileInfo.modified);
		if (!Number.isNaN(d.getTime())) {
			const pad = (n: number) => String(n).padStart(2, "0");
			localTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
		}
	}
	return `# ${fileInfo.path}\n# ${fileInfo.size} bytes\n# ${localTime}\n`;
}

/** Strip the 3-line header (lines starting with # containing metadata) from editor content */
function stripFileHeader(text: string): string {
	const lines = text.split("\n");
	let stripCount = 0;
	for (const line of lines) {
		if (stripCount >= 3) break;
		const trimmed = line.trim();
		if (
			trimmed.startsWith("#") &&
			(/^#\s*\//.test(trimmed) || /^#\s*\d+\s*bytes/.test(trimmed) || /^#\s*\d{4}-/.test(trimmed))
		) {
			stripCount++;
		} else {
			break;
		}
	}
	return stripCount > 0 ? lines.slice(stripCount).join("\n") : text;
}

function GeositeConfigPanelInner(): React.JSX.Element {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	const {
		data: listData,
		isLoading: listLoading,
		error: listError,
	} = useQuery({
		queryKey: GEOSITE_LIST_KEY,
		queryFn: () => smartdnsServer.GetGeositeList(),
	});

	const files = useMemo(() => (listData?.data ?? []).toSorted((a, b) => a.name.localeCompare(b.name)), [listData?.data]);

	const [selectedFile, setSelectedFile] = React.useState("");
	const [content, setContent] = React.useState("");
	const [saving, setSaving] = React.useState(false);
	const [saved, setSaved] = React.useState(false);
	const [error, setError] = React.useState("");
	const [downloading, setDownloading] = React.useState(false);
	const [updateMsg, setUpdateMsg] = React.useState("");

	// Query for file content
	const currentFile = files.find((f) => f.name === selectedFile);

	const {
		data: fileData,
		isLoading: fileLoading,
	} = useQuery({
		queryKey: geositeFileKey(selectedFile),
		queryFn: () => smartdnsServer.GetGeositeFile(selectedFile),
		enabled: !!selectedFile && currentFile?.source !== "remote" || (!!selectedFile && !!(currentFile as GeositeFileInfo | undefined)?.cache_path),
	});

	// Sync content from query result
	const rawServerContent = fileData?.data ? buildFileHeader(fileData.data.file_info) + fileData.data.content : "";

	React.useEffect(() => {
		if (rawServerContent) {
			setContent(rawServerContent);
		}
	}, [rawServerContent]);

	// For remote files without cache, show placeholder
	React.useEffect(() => {
		if (!selectedFile || !currentFile) return;
		if (currentFile.source === "remote" && !currentFile.cache_path) {
			setContent(`# ${currentFile.name}\n# ${t("Remote file - no cached data, click Update to download")}\n# URL: ${currentFile.path}\n`);
		}
	}, [selectedFile, currentFile, t]);

	const isRemote = currentFile?.source === "remote";
	const isModified = content !== rawServerContent && rawServerContent !== "";

	const handleFileChange = React.useCallback(
		(event: SelectChangeEvent) => {
			setSelectedFile(event.target.value);
			setSaved(false);
			setError("");
			setUpdateMsg("");
		},
		[],
	);

	const handleReloadFile = React.useCallback(async () => {
		if (!currentFile) return;
		setDownloading(true);
		setError("");
		setUpdateMsg("");

		if (isRemote) {
			const { error: dlErr } = await smartdnsServer.DownloadGeositeFile(currentFile.name);
			if (dlErr) {
				setDownloading(false);
				setUpdateMsg(dlErr?.toString() ?? t("Failed to download geosite files"));
				return;
			}
		}

		// Invalidate query to refetch file content
		await queryClient.invalidateQueries({ queryKey: geositeFileKey(currentFile.name) });
		setDownloading(false);
		setUpdateMsg(t("Update completed successfully."));
		setTimeout(() => setUpdateMsg(""), 5000);
	}, [currentFile, isRemote, queryClient, t]);

	const handleSave = React.useCallback(async () => {
		if (!currentFile) return;
		setSaving(true);
		setError("");
		const rawContent = stripFileHeader(content);
		const { error } = await smartdnsServer.SaveGeositeFile(currentFile.name, rawContent);
		setSaving(false);
		if (error) {
			setError(error?.toString() ?? t("Failed to save file"));
			return;
		}
		smartdnsServer.FlushCache();
		queryClient.invalidateQueries({ queryKey: geositeFileKey(currentFile.name) });
		setSaved(true);
		setTimeout(() => setSaved(false), 3000);
	}, [currentFile, content, queryClient, t]);

	const handleReset = React.useCallback(() => {
		setContent(rawServerContent);
		setSaved(false);
		setError("");
	}, [rawServerContent]);

	return (
		<Card sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 260px)" }}>
			<CardContent sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
				<Stack spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						{t("Geosite Data Files")}
					</Typography>
					{listLoading ? (
						<Stack sx={{ alignItems: "center", py: 4 }}>
							<CircularProgress size={32} />
						</Stack>
					) : (
						<Stack spacing={2} direction="row" alignItems="center">
							<FormControl size="small" sx={{ minWidth: 240 }}>
								<InputLabel>{t("Select file...")}</InputLabel>
								<Select value={selectedFile} label={t("Select file...")} onChange={handleFileChange}>
									{files.map((file) => (
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
									<Typography
										variant="caption"
										color="text.secondary"
										sx={{
											maxWidth: 400,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{currentFile.path}
									</Typography>
								</Stack>
							)}
							{isRemote && selectedFile && (
								<Button
									size="small"
									variant="contained"
									startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadOutlined />}
									onClick={handleReloadFile}
									disabled={downloading}
								>
									{t("Update")}
								</Button>
							)}
							{!fileLoading && content && (
								<Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
									{content.split("\n").length - 3} {t("lines")}
								</Typography>
							)}
						</Stack>
					)}
				</Stack>
				<Divider sx={{ mb: 2, flexShrink: 0 }} />
				{fileLoading ? (
					<Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
						<CircularProgress size={32} />
					</Stack>
				) : content ? (
					<Box sx={{ flex: 1, minHeight: 0 }}>
						<ConfigEditor content={content} onChange={setContent} readOnly={false} maxHeight="100%" minHeight="0" />
					</Box>
				) : null}
			</CardContent>
			{(error || listError) && (
				<Alert severity="error" sx={{ mx: 2 }}>
					{error || listError?.message}
				</Alert>
			)}
			{updateMsg && (
				<Alert severity="success" sx={{ mx: 2 }}>
					{updateMsg}
				</Alert>
			)}
			{saved && (
				<Alert severity="success" sx={{ mx: 2 }}>
					{t("Configuration saved successfully.")}
				</Alert>
			)}
			<Divider />
			<CardActions sx={{ justifyContent: "flex-end", px: 2 }}>
				<Button startIcon={<RefreshOutlined />} onClick={handleReset} disabled={fileLoading || !isModified}>
					{t("Reset")}
				</Button>
				<Button
					startIcon={<SaveOutlined />}
					variant="contained"
					onClick={handleSave}
					disabled={fileLoading || saving || !isModified}
				>
					{t("Save")}
				</Button>
			</CardActions>
		</Card>
	);
}

export function GeositeConfigPanel(): React.JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>
			<GeositeConfigPanelInner />
		</QueryClientProvider>
	);
}
