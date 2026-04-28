"use client";

import * as React from "react";
import { useColorScheme } from "@mui/material/styles";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { NoSsr } from "@/components/core/no-ssr";
import { smartdns } from "@/components/dashboard/settings/config-languages/smartdns";
import { Box } from "@mui/material";

export interface ConfigEditorProps {
	content: string;
	onChange?: (value: string) => void;
	readOnly?: boolean;
	minHeight?: number | string;
	language?: "smartdns" | "plaintext";
}

export function ConfigEditor({
	content,
	onChange,
	readOnly = false,
	minHeight = 400,
	language = "smartdns",
}: ConfigEditorProps): React.JSX.Element {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const cmRef = React.useRef<ReactCodeMirrorRef>(null);

	const extensions = React.useMemo(() => {
		const exts: Extension[] = [];
		if (language === "smartdns") {
			exts.push(smartdns());
		}
		exts.push(
			EditorView.theme({
				"&": {
					backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
				},
			}),
		);
		return exts;
	}, [language, isDark]);

	const minHeightPx = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

	return (
		<NoSsr fallback={<Box sx={{ minHeight, bgcolor: "grey.100", borderRadius: 1 }} />}>
			<CodeMirror
				ref={cmRef}
				value={content}
				onChange={onChange}
				readOnly={readOnly}
				theme={isDark ? vscodeDark : vscodeLight}
				extensions={extensions}
				height="auto"
				minHeight={minHeightPx}
				style={{
					fontSize: "13px",
					borderRadius: "8px",
					overflow: "hidden",
					border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
				}}
				basicSetup={{
					lineNumbers: true,
					highlightActiveLine: true,
					highlightActiveLineGutter: true,
					foldGutter: true,
					autocompletion: false,
					bracketMatching: true,
					closeBrackets: false,
					indentOnInput: false,
				}}
			/>
		</NoSsr>
	);
}
