import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useSettingsNavigationStore } from "@/lib/stores/settings";
import {
	existingModelSettingsLinks,
	pendingSettingsPages,
	type PendingSettingsTab,
} from "../lib/settings-navigation";
import { SettingsPanelLayout } from "./SettingsPanelLayout";

export function PendingSettingsPanel({
	tab,
	isCodexActive,
}: {
	tab: PendingSettingsTab;
	isCodexActive: boolean;
}) {
	const page = pendingSettingsPages[tab];
	const setActiveTab = useSettingsNavigationStore((state) => state.setActiveTab);
	return (
		<SettingsPanelLayout title={page.title}>
			<div className="max-w-3xl space-y-4">
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<span className="text-warning-foreground">【{page.status}】</span>
					<span className="text-xs text-muted-foreground">{page.task}</span>
				</div>
				<p className="text-sm leading-6 text-muted-foreground">{page.description}</p>
				{tab === "model-access" ? (
					<div className="flex flex-wrap gap-2">
						{existingModelSettingsLinks
							.filter((link) => link.value !== "codex-access" || isCodexActive)
							.map((link) => (
								<Button key={link.value} variant="outline" onClick={() => setActiveTab(link.value)}>
									<link.icon />
									{link.label}
									<ArrowRight />
								</Button>
							))}
					</div>
				) : null}
			</div>
		</SettingsPanelLayout>
	);
}
