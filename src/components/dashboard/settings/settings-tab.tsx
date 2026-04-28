"use client";

import * as React from "react";
import Stack from "@mui/material/Stack";

import { UpdatePasswordForm } from "@/components/dashboard/settings/update-password-form";
import { ChangeLang } from "@/components/dashboard/settings/change-lang";
import { MainConfigPanel } from "@/components/dashboard/settings/main-config-panel";
import { GeositeConfigPanel } from "@/components/dashboard/settings/geosite-config-panel";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Card, CardContent, Tab, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { DescriptionOutlined, PublicOutlined } from "@mui/icons-material";

const tabs = [
	{
		label: "Password",
		icon: undefined,
		panel: <UpdatePasswordForm />,
	},
	{
		label: "Language",
		icon: undefined,
		panel: <ChangeLang />,
	},
	{
		label: "Main Config",
		icon: <DescriptionOutlined fontSize="small" sx={{ mr: 0.5 }} />,
		panel: <MainConfigPanel />,
	},
	{
		label: "Geosite Config",
		icon: <PublicOutlined fontSize="small" sx={{ mr: 0.5 }} />,
		panel: <GeositeConfigPanel />,
	},
];

export default function SettingsTab(): React.JSX.Element {
	const { t } = useTranslation();
	const [value, setValue] = React.useState("0");

	const handleChange = (event: React.SyntheticEvent, newValue: string): void => {
		setValue(newValue);
	};

	return (
		<Stack spacing={1}>
			<Card>
				<Typography variant="h4" sx={{ marginTop: -2 }}>
					<TabContext value={value}>
						<CardContent>
							<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
								<TabList
									onChange={handleChange}
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
							{tabs.map((tab, index) => {
								return <TabPanel key={tab.label} value={index.toString()}>{tab.panel}</TabPanel>;
							})}
						</CardContent>
					</TabContext>
				</Typography>
			</Card>
		</Stack>
	);
}
