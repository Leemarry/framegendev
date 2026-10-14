import { create } from "zustand";

export const projectSettingsGeneralTab = "project-general";
export const projectSettingsSkillsTab = "project-skills";
export const projectSettingsTabs = [
	projectSettingsSkillsTab,
	"project-feishu",
	"project-files",
	projectSettingsGeneralTab,
] as const;
export const resolveProjectSettingsTab = (search: string) => {
	const tab = new URLSearchParams(search).get("tab");
	return projectSettingsTabs.find((value) => value === tab) ?? projectSettingsSkillsTab;
};

export type SettingsTabValue =
	| "appearance"
	| "api-keys"
	| "billing"
	| "codex-skills"
	| "updates"
	| "shortcuts"
	| typeof projectSettingsGeneralTab
	| string;

interface SettingsNavigationState {
	activeTab: SettingsTabValue;
	setActiveTab: (tab: SettingsTabValue) => void;
}

export const useSettingsNavigationStore = create<SettingsNavigationState>()((set) => ({
	activeTab: "appearance",
	setActiveTab: (tab) => set({ activeTab: tab }),
}));
