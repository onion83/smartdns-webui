"use client";

import React from "react";
import Stack from "@mui/material/Stack";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	// Divider,
	IconButton,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	Checkbox,
	FormControlLabel,
	MenuItem,
	alpha,
} from "@mui/material";
import { smartdnsServer, type DomainResolveChain, type DnsServerQueryResult } from "@/lib/backend/server";
import { SearchOutlined, ContentCopyOutlined, ArrowForwardOutlined, CheckCircleOutlined } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			gcTime: 0,
			retry: false,
		},
	},
});

const RECORD_TYPES = ["A", "AAAA", "CNAME", "NS", "MX", "SRV", "TXT", "SOA", "PTR", "HTTPS"] as const;

const RESPONSE_MODE_NAMES: Record<string, string> = {
	"FIRST_PING_IP": "First Ping IP",
	"FASTEST_IP": "Fastest IP",
	"FASTEST_RESPONSE": "Fastest Response",
};

function ResponseModeLabel({ mode }: { mode: string }): React.JSX.Element {
	const name = RESPONSE_MODE_NAMES[mode] ?? `MODE_${mode}`;
	return (
		<Chip label={name} size="small" variant="outlined" color="info" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
	);
}

const ACTION_COLORS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
	NONE: "default",
	ADDRESS: "info",
	NAMESERVER: "success",
	UNKNOWN: "error",
};

const RCODE_COLORS: Record<string, "success" | "warning" | "error" | "default" | "info"> = {
	NOERROR: "success",
	TIMEOUT: "warning",
	NXDOMAIN: "error",
	SERVFAIL: "error",
	NO_ANSWER: "default",
	UNKNOWN: "error",
};

function CopyButton({ text }: { text: string }): React.JSX.Element {
	const { t } = useTranslation();
	const [copied, setCopied] = React.useState(false);

	const handleCopy = React.useCallback(async () => {
		try {
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(text);
			} else {
				// Fallback for insecure contexts (plain HTTP access): the async
				// clipboard API is unavailable there.
				const textarea = document.createElement("textarea");
				textarea.value = text;
				textarea.style.position = "fixed";
				textarea.style.opacity = "0";
				document.body.append(textarea);
				textarea.focus();
				textarea.select();
				document.execCommand("copy");
				textarea.remove();
			}
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// ignore
		}
	}, [text]);

	return (
		<Tooltip title={copied ? t("Copied!") : t("Copy")}>
			<IconButton size="small" onClick={handleCopy} sx={{ ml: 0.5, opacity: 0.6, "&:hover": { opacity: 1 } }}>
				{copied ? <CheckCircleOutlined fontSize="small" sx={{ color: "success.main" }} /> : <ContentCopyOutlined fontSize="small" />}
			</IconButton>
		</Tooltip>
	);
}

function FlowArrow(): React.JSX.Element {
	return <ArrowForwardOutlined sx={{ fontSize: 16, color: "text.secondary", mx: 0.5 }} />;
}

function RcodeChip({ rcode }: { rcode: string }): React.JSX.Element {
	return <Chip label={rcode} size="small" color={RCODE_COLORS[rcode] ?? "default"} variant="outlined" />;
}

function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
	return (
		<Typography
			variant="caption"
			sx={{
				fontWeight: 600,
				textTransform: "uppercase",
				letterSpacing: "0.05em",
				color: "text.secondary",
			}}
		>
			{children}
		</Typography>
	);
}

function IpList({ ips }: { ips: string }): React.JSX.Element {
	const ipArray = ips
		.split(", ")
		.map((ip) => ip.trim())
		.filter(Boolean);
	if (ipArray.length === 0) return <span>—</span>;

	return (
		<Stack spacing={0.25} direction="row" flexWrap="wrap" useFlexGap gap={0.5} alignItems="center">
			{ipArray.map((ip, i) => (
				<Stack key={i} direction="row" alignItems="center">
					<Chip label={ip} size="small" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.7rem", height: 22 }} />
					<CopyButton text={ip} />
				</Stack>
			))}
		</Stack>
	);
}

function ChainResultCard({ chain }: { chain: DomainResolveChain }): React.JSX.Element {
	const { t } = useTranslation();
	const isPass = chain.rule_name === "PASS";
	const hasAddress = chain.action === "ADDRESS";
	const hasNameserver = chain.action === "NAMESERVER";
	const isCacheHit = chain.cache_result.hit === 1;
	// A/AAAA answers are displayed as IP lists; other record types as raw data
	const isIpType = chain.query_qtype === 1 || chain.query_qtype === 28;

	return (
		<Stack spacing={2.5}>
			{/* Section 1: Rule Match Flow */}
			<Box>
				<SectionLabel>{t("Rule Match")}</SectionLabel>
				<Card
					variant="outlined"
					sx={{
						mt: 0.75,
						p: 1.5,
						backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.03),
						borderColor: (theme) => alpha(theme.palette.primary.main, 0.15),
					}}
				>
					<Stack spacing={1} direction="row" alignItems="center" flexWrap="wrap" useFlexGap gap={0.75}>
						<Typography variant="body1" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
							{chain.domain}
						</Typography>
						<FlowArrow />
						<Chip
							label={isPass ? t("No rule matched") : chain.rule_name}
							size="small"
							color={isPass ? "default" : "primary"}
							variant={isPass ? "outlined" : "filled"}
						/>
						{chain.action !== "NONE" && (
							<>
								<FlowArrow />
								<Chip
									label={t("Action") + ": " + chain.action}
									size="small"
									color={ACTION_COLORS[chain.action] ?? "default"}
									variant="outlined"
								/>
							</>
						)}
						{(chain.action === "NAMESERVER" || chain.action === "NONE") && chain.group_name && (
							<>
								<FlowArrow />
								<Chip
									label={t("Server Group") + ": " + chain.group_name}
									size="small"
									variant="outlined"
									color="primary"
								/>
							</>
						)}
						{chain.matched_pattern && !isPass && (
							<>
								<FlowArrow />
								<Tooltip title={chain.matched_pattern}>
									<Chip
										label={chain.matched_pattern.length > 40 ? chain.matched_pattern.slice(0, 37) + "..." : chain.matched_pattern}
										size="small"
										variant="outlined"
										sx={{ fontFamily: "monospace", fontSize: "0.7rem", maxWidth: 300, overflow: "hidden" }}
									/>
								</Tooltip>
							</>
						)}
					</Stack>
				</Card>
			</Box>

			{/* Section 2: Cache Result */}
			{(hasNameserver || !hasAddress) && (
				<Box>
					<SectionLabel>{t("Cache Status")}</SectionLabel>
					<Card variant="outlined" sx={{ mt: 0.75, p: 1.5 }}>
						<Stack spacing={1} direction="row" alignItems="center" flexWrap="wrap" useFlexGap gap={1}>
							<Chip
								label={isCacheHit ? t("Cache HIT") : t("Cache MISS")}
								size="small"
								color={isCacheHit ? "success" : "warning"}
								variant={isCacheHit ? "filled" : "outlined"}
							/>
							{isCacheHit && (
								<>
									{chain.cache_result.ttl > 0 && (
										<Chip label={`TTL ${chain.cache_result.ttl}s`} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
									)}
									{chain.cache_result.speed > 0 && (
										<Chip
											label={`${(chain.cache_result.speed / 10).toFixed(1)}ms`}
											size="small"
											variant="outlined"
											color="success"
											sx={{ fontSize: "0.7rem" }}
										/>
									)}
								</>
							)}
						</Stack>
					</Card>
				</Box>
			)}

			{/* Section 3: Query Details */}
			<Box>
				<SectionLabel>{t("Server Group Details")}</SectionLabel>
				<Card variant="outlined" sx={{ mt: 0.75, p: 1.5 }}>
					{hasAddress ? (
						<Stack spacing={0.5} direction="row" alignItems="center">
							<Typography variant="body2" color="text.secondary">
								{t("Static Address")}:
							</Typography>
							<Stack direction="row" alignItems="center">
								<Typography variant="body1" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
									{chain.address}
								</Typography>
								<CopyButton text={chain.address} />
							</Stack>
						</Stack>
					) : (
						<Stack spacing={1}>
							<Stack spacing={0.5} direction="row" alignItems="center">
								<Typography variant="body2" color="text.secondary">
									{t("Server Group")}:
								</Typography>
								<Chip label={chain.group_name || t("Default")} size="small" variant="outlined" color="primary" />
								<Typography variant="body2" color="text.secondary">
									({chain.server_num} {t("servers")})
								</Typography>
							</Stack>
							<Stack spacing={0.5} direction="row" alignItems="center" flexWrap="wrap" useFlexGap gap={0.5}>
								{chain.servers.map((server, i) => (
									<Chip
										key={i}
										label={server}
										size="small"
										variant="outlined"
										sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
									/>
								))}
							</Stack>
						</Stack>
					)}
				</Card>
			</Box>

			{/* Section 4: Per-Server Query Results (only if cache miss) */}
			{(hasNameserver || !hasAddress) && !isCacheHit && chain.query_results.length > 0 && (
				<Box>
					<SectionLabel>{t("Server Query Details")}</SectionLabel>
					<TableContainer
						component={Paper}
						variant="outlined"
						sx={{ mt: 0.75, maxHeight: 320, overflow: "auto" }}
					>
						<Table size="small" stickyHeader>
							<TableHead>
								<TableRow>
									<TableCell sx={{ fontWeight: 600, minWidth: 200 }}>{t("Server")}</TableCell>
									<TableCell sx={{ fontWeight: 600 }} align="center">{t("Status")}</TableCell>
									<TableCell sx={{ fontWeight: 600, minWidth: 120 }}>{t("CNAME")}</TableCell>
									<TableCell sx={{ fontWeight: 600, minWidth: 280 }}>
										{isIpType ? t("IP Addresses") : t("Record Data")}
									</TableCell>
									<TableCell sx={{ fontWeight: 600 }} align="right">{t("TTL")}</TableCell>
									<TableCell sx={{ fontWeight: 600 }} align="right">{t("Latency")}</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{chain.query_results.map((result: DnsServerQueryResult, i: number) => {
									const isTimeout = result.rcode === "TIMEOUT";
									return (
										<TableRow
											key={i}
											hover
											sx={{
												opacity: isTimeout ? 0.55 : 1,
												"&:last-child td, &:last-child th": { border: 0 },
											}}
										>
											<TableCell sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
												{result.server}
											</TableCell>
											<TableCell align="center">
												<RcodeChip rcode={result.rcode} />
											</TableCell>
											<TableCell
												sx={{
													fontFamily: "monospace",
													fontSize: "0.78rem",
													maxWidth: 200,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}
											>
												{result.cname || "—"}
											</TableCell>
											<TableCell>
												{isIpType ? (
													<IpList ips={result.ips} />
												) : (
													<Typography
														sx={{
															fontFamily: "monospace",
															fontSize: "0.78rem",
															maxWidth: 340,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
														}}
													>
														{result.rdata || "—"}
													</Typography>
												)}
											</TableCell>
											<TableCell align="right" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
												{result.ttl > 0 ? `${result.ttl}s` : "—"}
											</TableCell>
											<TableCell
												align="right"
												sx={{
													fontSize: "0.78rem",
													color: result.ping_ms > 0 ? (result.ping_ms > 500 ? "warning.main" : "success.main") : "text.secondary",
													fontWeight: result.ping_ms > 500 ? 600 : 400,
												}}
											>
												{result.ping_ms > 0 ? `${result.ping_ms}ms` : "—"}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			)}

			{/* Section 5: Ping Results (Speed Check) */}
			{(hasNameserver || !hasAddress) && !isCacheHit && chain.ping_results.length > 0 && (
				<Box>
					<SectionLabel>{t("Speed Check")}</SectionLabel>
					<Card variant="outlined" sx={{ mt: 0.75, p: 1.5 }}>
						<Stack spacing={1}>
							<ResponseModeLabel mode={chain.response_mode} />
							{chain.ping_results.map((pr, i) => (
								<Stack key={i} spacing={0.5} direction="row" alignItems="center">
									<Typography variant="body2" sx={{ fontFamily: "monospace", minWidth: 140 }}>
										{pr.ip}
									</Typography>
									{pr.is_timeout === 1 ? (
										<Chip label={t("Timeout")} size="small" color="warning" variant="outlined" sx={{ fontSize: "0.7rem" }} />
									) : (
										<Chip
											label={`${pr.ping_ms}ms`}
											size="small"
											color={pr.ping_ms > 100 ? "warning" : "success"}
											variant="outlined"
											sx={{ fontSize: "0.7rem" }}
										/>
									)}
								</Stack>
							))}
						</Stack>
					</Card>
				</Box>
			)}

			{/* Section 6: Final Result */}
			<Box>
				<SectionLabel>{t("Final Result")}</SectionLabel>
				<Card
					variant="outlined"
					sx={{
						mt: 0.75,
						p: 1.5,
						backgroundColor: (theme) => {
							const rcodeColor = RCODE_COLORS[chain.final_rcode] ?? "default";
							// theme.palette.text.secondary is a CSS var string in cssVariables mode,
							// which alpha() cannot parse (MUI error #9). Use a real hex instead.
							const color = rcodeColor === "default" ? theme.palette.grey[500] : theme.palette[rcodeColor].main;
							return alpha(color, 0.06);
						},
						borderColor: (theme) => {
							const rcodeColor = RCODE_COLORS[chain.final_rcode] ?? "default";
							const color = rcodeColor === "default" ? theme.palette.grey[500] : theme.palette[rcodeColor].main;
							return alpha(color, 0.25);
						},
					}}
				>
					<Stack spacing={1}>
						<Stack spacing={1} direction="row" alignItems="center" flexWrap="wrap" useFlexGap gap={1}>
							<RcodeChip rcode={chain.final_rcode} />
							{chain.final_from && (
								<Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
									from {chain.final_from}
								</Typography>
							)}
							{chain.final_ttl > 0 && (
								<Chip label={`TTL ${chain.final_ttl}s`} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
							)}
							{chain.final_ping_ms > 0 && (
								<Chip
									label={`${chain.final_ping_ms}ms`}
									size="small"
									variant="outlined"
									color={chain.final_ping_ms > 500 ? "warning" : "success"}
									sx={{ fontSize: "0.7rem" }}
								/>
							)}
						</Stack>
						{chain.final_ips && (
							<Stack spacing={0.5} direction="row" alignItems="center">
								<Typography variant="body2" color="text.secondary">
									{t("IP")}:
								</Typography>
								<Stack spacing={0.25} direction="row" flexWrap="wrap" useFlexGap gap={0.5} alignItems="center">
									<Typography variant="body1" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
										{chain.final_ips}
									</Typography>
									<CopyButton text={chain.final_ips} />
								</Stack>
							</Stack>
						)}
						{chain.final_data && (
							<Stack spacing={0.5} direction="row" alignItems="center">
								<Typography variant="body2" color="text.secondary">
									{t("Record Data")}:
								</Typography>
								<Stack spacing={0.25} direction="row" flexWrap="wrap" useFlexGap gap={0.5} alignItems="center">
									<Typography variant="body1" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
										{chain.final_data}
									</Typography>
									<CopyButton text={chain.final_data} />
								</Stack>
							</Stack>
						)}
						{chain.final_cname && (
							<Stack spacing={0.5} direction="row" alignItems="center">
								<Typography variant="body2" color="text.secondary">
									{t("CNAME")}:
								</Typography>
								<Typography variant="body1" sx={{ fontFamily: "monospace" }}>
									{chain.final_cname}
								</Typography>
								<CopyButton text={chain.final_cname} />
							</Stack>
						)}
						{!chain.final_ips && !chain.final_cname && !chain.final_data && (
							<Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
								{t("No answer received")}
							</Typography>
						)}
					</Stack>
				</Card>
			</Box>
		</Stack>
	);
}

function CheckDomainRuleInner(): React.JSX.Element {
	const { t } = useTranslation();
	const [domain, setDomain] = React.useState("");
	const [searchDomain, setSearchDomain] = React.useState("");
	const [skipCache, setSkipCache] = React.useState(false);
	const [queryAllServers, setQueryAllServers] = React.useState(false);
	const [qtype, setQtype] = React.useState("A");
	// Snapshot of the option checkboxes taken at the moment "Check" was clicked,
	// so that toggling a checkbox afterwards never triggers a request by itself —
	// the options only take effect together with the Check button.
	const [searchSkipCache, setSearchSkipCache] = React.useState(false);
	const [searchQueryAll, setSearchQueryAll] = React.useState(false);
	const [searchQtype, setSearchQtype] = React.useState("A");
	// Bumped on every "Check" click so re-checking the same domain produces a
	// new query key and always issues a fresh request (no stale cached data).
	const [requestSeq, setRequestSeq] = React.useState(0);

	const handleSearch = React.useCallback(() => {
		const trimmed = domain.trim();
		if (trimmed) {
			setSearchDomain(trimmed);
			setSearchSkipCache(skipCache);
			setSearchQueryAll(queryAllServers);
			setSearchQtype(qtype);
			setRequestSeq((seq) => seq + 1);
		}
	}, [domain, skipCache, queryAllServers, qtype]);

	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === "Enter") {
				handleSearch();
			}
		},
		[handleSearch],
	);

	const {
		data: chainData,
		isLoading,
		error,
	} = 	useQuery({
		queryKey: ["check-domain-rule", searchDomain, requestSeq, searchSkipCache, searchQueryAll, searchQtype],
		queryFn: () => smartdnsServer.CheckDomainRule(searchDomain, searchSkipCache, searchQueryAll, searchQtype),
		enabled: !!searchDomain,
	});

	const chain = chainData?.data;

	return (
		<Card>
			<CardContent>
				<Stack spacing={2}>
					{/* Search bar */}
					<Stack spacing={1} direction="row" alignItems="center">
						<TextField
							select
							size="small"
							label={t("Record Type")}
							value={qtype}
							onChange={(e) => setQtype(e.target.value)}
							sx={{ width: 150 }}
						>
							{RECORD_TYPES.map((rt) => (
								<MenuItem key={rt} value={rt}>
									{rt}
								</MenuItem>
							))}
						</TextField>
						<TextField
							size="small"
							placeholder={t("Enter a domain name to check which rule matches and how it resolves...")}
							value={domain}
							onChange={(e) => setDomain(e.target.value)}
							onKeyDown={handleKeyDown}
							sx={{ flex: 1, maxWidth: 560 }}
							slotProps={{
								htmlInput: {
									autoComplete: "off",
									autoFocus: true,
								},
							}}
						/>
						<Button
							variant="contained"
							startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <SearchOutlined />}
							onClick={handleSearch}
							disabled={isLoading || !domain.trim()}
						>
							{t("Check")}
						</Button>
						<FormControlLabel
							control={
								<Checkbox
									size="small"
									checked={skipCache || queryAllServers}
									disabled={queryAllServers}
									onChange={(e) => setSkipCache(e.target.checked)}
								/>
							}
							label={
								<Tooltip title={t("Delete cached entries of the domain first, then re-query the servers")}>
									<Typography variant="body2">{t("Clear cache")}</Typography>
								</Tooltip>
							}
							sx={{ ml: 0.5 }}
						/>
						<FormControlLabel
							control={
								<Checkbox
									size="small"
									checked={queryAllServers}
									onChange={(e) => {
										setQueryAllServers(e.target.checked);
										// Querying all servers always bypasses the cache;
										// force-check "Skip cache" and lock it while active.
										if (e.target.checked) {
											setSkipCache(true);
										}
									}}
								/>
							}
							label={
								<Tooltip title={t("Force querying all servers in the group and clear the cached entries")}>
									<Typography variant="body2">{t("Query all servers")}</Typography>
								</Tooltip>
							}
							sx={{ ml: 0.5 }}
						/>
					</Stack>

					{/* Loading */}
					{isLoading && (
						<Stack sx={{ alignItems: "center", py: 5 }}>
							<CircularProgress size={32} />
							<Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
								{t("Resolving")} {searchDomain}...
							</Typography>
						</Stack>
					)}

					{/* Error */}
					{error && !isLoading && (
						<Alert severity="error">{error?.message ?? t("Failed to check domain rule")}</Alert>
					)}

					{/* Result */}
					{chain && !isLoading && (
						<Box sx={{ mt: 0.5 }}>
							<ChainResultCard chain={chain} />
						</Box>
					)}
				</Stack>
			</CardContent>
		</Card>
	);
}

export function CheckDomainRulePanel(): React.JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>
			<CheckDomainRuleInner />
		</QueryClientProvider>
	);
}
