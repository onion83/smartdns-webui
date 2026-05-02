"use client";

import * as React from "react";
import Stack from "@mui/material/Stack";
import { useMemo } from "react";
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Divider, Typography } from "@mui/material";
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

function MainConfigPanelInner(): React.JSX.Element {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	// Fetch the list of config files
	const {
		data: confFilesData,
		isLoading: isLoadingFiles,
		error: filesError,
	} = useQuery({
		queryKey: ["config", "conf-files"],
		queryFn: () => smartdnsServer.GetConfFiles(),
	});

	const confFiles = useMemo(() => confFilesData?.data ?? [], [confFilesData?.data]);

	// Currently selected file (default to first / main)
	const [selectedPath, setSelectedPath] = React.useState<string | null>(null);

	// Sync selectedPath when files load
	React.useEffect(() => {
		if (confFiles.length > 0 && (selectedPath === null || !confFiles.some((f) => f.path === selectedPath))) {
			setSelectedPath(confFiles[0].path);
		}
	}, [confFiles, selectedPath]);

	// Fetch content of the selected file
	const {
		data: fileData,
		isLoading: isLoadingContent,
		error: contentError,
	} = useQuery({
		queryKey: ["config", "file", selectedPath],
		queryFn: () => smartdnsServer.GetConfigFile(selectedPath!),
		enabled: !!selectedPath,
	});

	const serverContent = fileData?.data?.content ?? "";
	const [content, setContent] = React.useState("");
	const [contentPath, setContentPath] = React.useState<string | null>(null);
	const [savedContent, setSavedContent] = React.useState("");
	const [saving, setSaving] = React.useState(false);
	const [saved, setSaved] = React.useState(false);
	const [saveError, setSaveError] = React.useState("");
	const [validating, setValidating] = React.useState(false);

	// When new file content arrives (and loading is done), update editor and track which file it belongs to
	// Guard with !isLoadingContent to prevent stale content from being applied during file switch
	React.useEffect(() => {
		if (!isLoadingContent && serverContent && selectedPath) {
			setContent(serverContent);
			setContentPath(selectedPath);
			setSavedContent(serverContent);
			if (contentPath !== selectedPath) {
				setSaved(false);
			}
			setSaveError("");
		}
	}, [serverContent, selectedPath, isLoadingContent, contentPath]);

	// Only consider modified when content differs from last saved/loaded content
	const isModified = contentPath === selectedPath && content !== savedContent;

	const handleSave = React.useCallback(async () => {
		if (!selectedPath) return;
		setSaving(true);
		setSaveError("");
		const { error } = await smartdnsServer.SaveConfigFile(selectedPath, content);
		if (error) {
			setSaving(false);
			setSaveError(error?.toString() ?? t("Failed to save configuration"));
			return;
		}
		// Validate config after save
		setValidating(true);
		const validateResult = await smartdnsServer.ValidateConfig();
		setValidating(false);
		if (validateResult.error) {
			setSaving(false);
			setSaveError(validateResult.error?.toString() ?? t("Configuration validation failed"));
			return;
		}
		if (!validateResult.data?.valid) {
			setSaving(false);
			setSaveError(validateResult.data?.message ?? t("Configuration validation failed"));
			return;
		}
		setSavedContent(content);
		queryClient.setQueryData<{ error?: ServerError; data?: ConfigFileData | null }>(
			["config", "file", selectedPath],
			(old) => {
				if (!old?.data) return old;
				return { ...old, data: { ...old.data, content } };
			},
		);
		setSaving(false);
		setSaved(true);
		setTimeout(() => setSaved(false), 3000);
	}, [content, selectedPath, queryClient, t]);

	const handleReset = React.useCallback(() => {
		setContent(serverContent);
		setSavedContent(serverContent);
		setSaved(false);
		setSaveError("");
	}, [serverContent]);

	const handleSelectFile = React.useCallback(
		(path: string) => {
			if (isModified) {
				const confirm = window.confirm(t("You have unsaved changes. Discard and switch file?"));
				if (!confirm) return;
			}
			setSelectedPath(path);
		},
		[isModified, t],
	);

	const selectedFile = confFiles.find((f) => f.path === selectedPath);

	return (
		<Card sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 260px)" }}>
			<CardContent sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
				<Stack spacing={1} direction="row" alignItems="center" sx={{ mb: 1, flexWrap: "wrap", gap: 1, flexShrink: 0 }}>
					{isLoadingFiles ? (
						<CircularProgress size={20} />
					) : (
						confFiles.map((file) => (
							<Chip
								key={file.path}
								label={file.name}
								size="small"
								color={file.type === "main" ? "primary" : "success"}
								variant={file.path === selectedPath ? "filled" : "outlined"}
								onClick={() => handleSelectFile(file.path)}
								sx={{ cursor: "pointer" }}
							/>
						))
					)}
					{!isLoadingContent && content && (
						<Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
							{content.split("\n").length} {t("lines")}
						</Typography>
					)}
				</Stack>
				{selectedFile && (
					<Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", flexShrink: 0 }}>
						{selectedFile.type === "main" ? t("Main Config") : t("Sub Config")} — {selectedFile.path}
					</Typography>
				)}
				<Divider sx={{ mb: 2, flexShrink: 0 }} />
				{isLoadingContent ? (
					<Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
						<CircularProgress size={32} />
					</Stack>
				) : content ? (
					<Box sx={{ flex: 1, minHeight: 0 }}>
						<ConfigEditor content={content} onChange={setContent} maxHeight="100%" minHeight="0" />
					</Box>
				) : null}
			</CardContent>
			{(saveError || filesError || contentError) && (
				<Alert severity="error" sx={{ mx: 2 }}>
					{saveError || filesError?.message || contentError?.message}
				</Alert>
			)}
			{saved && (
				<Alert severity="success" sx={{ mx: 2 }}>
					{t("Configuration saved successfully.")}
				</Alert>
			)}
			<Divider />
			<CardActions sx={{ justifyContent: "flex-end", px: 2 }}>
				<Button startIcon={<RefreshOutlined />} onClick={handleReset} disabled={isLoadingContent || !isModified}>
					{t("Reset")}
				</Button>
				<Button
					startIcon={validating ? <CircularProgress size={16} /> : <SaveOutlined />}
					variant="contained"
					onClick={handleSave}
					disabled={isLoadingContent || saving || validating || !isModified}
				>
					{validating ? t("Validating...") : t("Save")}
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
