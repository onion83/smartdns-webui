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

/** Build 3-line header comment for the editor display */
function buildFileHeader(fileInfo?: { path: string; size: number; modified: string }): string {
	if (!fileInfo) return "";
	let localTime = fileInfo.modified;
	// Backend returns UTC ISO 8601 (e.g. "2025-04-29T16:30:00Z"), convert to local time
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
	// Strip up to 3 leading comment lines that match the header pattern
	let stripCount = 0;
	for (const line of lines) {
		if (stripCount >= 3) break;
		const trimmed = line.trim();
		if (trimmed.startsWith("#") && (
			/^#\s*\//.test(trimmed) ||       // # /path/...
			/^#\s*\d+\s*bytes/.test(trimmed) || // # 12345 bytes
			/^#\s*\d{4}-/.test(trimmed)       // # 2025-04-29 ...
		)) {
			stripCount++;
		} else {
			break;
		}
	}
	return stripCount > 0 ? lines.slice(stripCount).join("\n") : text;
}

export function GeositeConfigPanel(): React.JSX.Element {
	const { t } = useTranslation();
	const [files, setFiles] = React.useState<GeositeFileInfo[]>([]);
	const [selectedFile, setSelectedFile] = React.useState<string>("");
	const [content, setContent] = React.useState<string>("");
	const [originalContent, setOriginalContent] = React.useState<string>("");
	const [saved, setSaved] = React.useState(false);
	const [error, setError] = React.useState("");
	const [loading, setLoading] = React.useState(true);
	const [fileLoading, setFileLoading] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [downloading, setDownloading] = React.useState(false);
	const [updateMsg, setUpdateMsg] = React.useState("");

	// Load geosite file list
	React.useEffect(() => {
		let cancelled = false;
		const loadList = async () => {
			setLoading(true);
			setError("");
			const { error, data } = await smartdnsServer.GetGeositeList();
			if (cancelled) return;
			if (error || !data || data.length === 0) {
				if (error) {
					setError(error?.toString() ?? t("Failed to load geosite file list"));
				}
				setLoading(false);
				return;
			}
			setFiles(data);
			setLoading(false);
		};
		loadList();
		return () => {
			cancelled = true;
		};
	}, [t]);

	// Load file content when selection changes
	React.useEffect(() => {
		if (!selectedFile) return;

		const currentFile = files.find((f) => f.name === selectedFile);
		if (!currentFile) return;

		// For remote files with cache_path, read the cached local file
		if (currentFile.source === "remote") {
			if (!currentFile.cache_path) {
				setContent(`# ${currentFile.name}\n# ${t("Remote file - no cached data, click Update to download")}\n# URL: ${currentFile.path}\n`);
				setOriginalContent("");
				return;
			}

			let cancelled = false;
			const loadFile = async () => {
				setFileLoading(true);
				setError("");
				const { error, data } = await smartdnsServer.GetGeositeFile(currentFile.path, currentFile.cache_path);
				if (cancelled) return;
				setFileLoading(false);
				if (error || !data) {
					setContent(`# ${currentFile.name}\n# ${t("Remote file - no cached data, click Update to download")}\n# URL: ${currentFile.path}\n`);
					setOriginalContent("");
					return;
				}
				const header = buildFileHeader(data.file_info);
				const displayContent = header + data.content;
				setContent(displayContent);
				setOriginalContent(displayContent);
			};
			loadFile();
			return () => {
				cancelled = true;
			};
		}

		// Local file
		let cancelled = false;
		const loadFile = async () => {
			setFileLoading(true);
			setError("");
			const { error, data } = await smartdnsServer.GetGeositeFile(currentFile.path);
			if (cancelled) return;
			setFileLoading(false);
			if (error || !data) {
				setContent(`# ${currentFile.name}\n# ${t("Failed to load file content")}\n`);
				setOriginalContent("");
				return;
			}
			const header = buildFileHeader(data.file_info);
			const displayContent = header + data.content;
			setContent(displayContent);
			setOriginalContent(displayContent);
		};
		loadFile();
		return () => {
			cancelled = true;
		};
	}, [selectedFile, files, t]);

	const handleFileChange = React.useCallback(
		(event: SelectChangeEvent) => {
			const name = event.target.value;
			setSelectedFile(name);
			setSaved(false);
			setError("");
			setUpdateMsg("");
		},
		[],
	);

	const currentFile = files.find((f) => f.name === selectedFile);
	const isRemote = currentFile?.source === "remote";
	const isModified = content !== originalContent && originalContent !== "";

	const handleReloadFile = React.useCallback(async () => {
		if (!currentFile) return;
		setDownloading(true);
		setError("");
		setUpdateMsg("");

		// For remote files, trigger download first, then read the cache
		if (isRemote) {
			const { error: dlErr } = await smartdnsServer.DownloadGeositeFiles();
			if (dlErr) {
				setDownloading(false);
				setUpdateMsg(dlErr?.toString() ?? t("Failed to download geosite files"));
				return;
			}
		}

		// Read the file content into the editor
		const cachePath = isRemote ? currentFile.cache_path : undefined;
		const { error, data } = await smartdnsServer.GetGeositeFile(currentFile.path, cachePath);
		setDownloading(false);
		if (error || !data) {
			setUpdateMsg(error?.toString() ?? t("Failed to load file content"));
			return;
		}
		const header = buildFileHeader(data.file_info);
		const displayContent = header + data.content;
		setContent(displayContent);
		setOriginalContent(displayContent);
		setUpdateMsg(t("Update completed successfully."));
		setTimeout(() => setUpdateMsg(""), 5000);
	}, [currentFile, isRemote, t]);

	const handleSave = React.useCallback(async () => {
		if (!currentFile) return;
		setSaving(true);
		setError("");
		const cachePath = isRemote ? currentFile.cache_path : undefined;
		const rawContent = stripFileHeader(content);
		const { error } = await smartdnsServer.SaveGeositeFile(currentFile.path, rawContent, cachePath);
		setSaving(false);
		if (error) {
			setError(error?.toString() ?? t("Failed to save file"));
			return;
		}
		setOriginalContent(content);
		setSaved(true);
		setTimeout(() => setSaved(false), 3000);
	}, [currentFile, content, isRemote, t]);

	const handleReset = React.useCallback(() => {
		setContent(originalContent);
		setSaved(false);
		setError("");
	}, [originalContent]);

	return (
		<Card>
			<CardContent>
				<Stack spacing={2} sx={{ mb: 2 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						{t("Geosite Data Files")}
					</Typography>
					{loading ? (
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
				<Divider sx={{ mb: 2 }} />
				{fileLoading ? (
					<Stack sx={{ height: 300, alignItems: "center", justifyContent: "center" }}>
						<CircularProgress size={32} />
					</Stack>
				) : (
					content && <ConfigEditor content={content} onChange={setContent} readOnly={false} maxHeight={500} />
				)}
			</CardContent>
			{error && (
				<Alert severity="error" sx={{ mx: 2 }}>
					{error}
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
