"use client";

import * as React from "react";
import Stack from "@mui/material/Stack";

import { UpdatePasswordForm } from "@/components/dashboard/settings/update-password-form";
import { ChangeLang } from "@/components/dashboard/settings/change-lang";
import { MainConfigPanel } from "@/components/dashboard/settings/main-config-panel";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Card, CardContent, Tab } from "@mui/material";
import { useTranslation } from "react-i18next";
import { DescriptionOutlined, LockResetOutlined, LanguageOutlined } from "@mui/icons-material";

const tabs = [
	{
		label: "Main Config",
		icon: <DescriptionOutlined fontSize="small" sx={{ mr: 0.5 }} />,
	},
	{
		label: "Password",
		icon: <LockResetOutlined fontSize="small" sx={{ mr: 0.5 }} />,
	},
	{
		label: "Language",
		icon: <LanguageOutlined fontSize="small" sx={{ mr: 0.5 }} />,
	},
];

export default function SettingsTab(): React.JSX.Element {
	const { t } = useTranslation();
	const [value, setValue] = React.useState("0");

	return (
		<Stack spacing={1} sx={{ width: "100%" }}>
			<Card sx={{ width: "100%" }}>
				<TabContext value={value}>
					<CardContent sx={{ width: "100%", maxWidth: "100%", px: 2 }}>
						<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
							<TabList
								onChange={(_event, newValue) => setValue(newValue)}
								variant="scrollable"
								scrollButtons="auto"
							>
								{tabs.map((tab, index) => {
									return (
										<Tab
											key={tab.label}
											label={
												<Stack direction="row" alignItems="center" spacing={0.5}>
													{tab.icon}
													{t(tab.label)}
												</Stack>
											}
											value={index.toString()}
										/>
									);
								})}
							</TabList>
						</Box>
						<TabPanel value="0" sx={{ width: "100%", px: 0 }}><MainConfigPanel /></TabPanel>
						<TabPanel value="1" sx={{ width: "100%", px: 0 }}><UpdatePasswordForm /></TabPanel>
						<TabPanel value="2" sx={{ width: "100%", px: 0 }}><ChangeLang /></TabPanel>
					</CardContent>
				</TabContext>
			</Card>
		</Stack>
	);
}
