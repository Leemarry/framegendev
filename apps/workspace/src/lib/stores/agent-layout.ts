import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type AgentLayoutMode = "panel" | "fullscreen";
export type AgentLayoutTab = "document" | "agent";

interface AgentLayoutState {
	dockGeometry: { width: number; height: number; x: number; y: number };
	setDockGeometry: (geometry: AgentLayoutState["dockGeometry"]) => void;
	mode: AgentLayoutMode;
	tab: AgentLayoutTab;
	setMode: (mode: AgentLayoutMode) => void;
	setTab: (tab: AgentLayoutTab) => void;
	enterFullscreen: (tab?: AgentLayoutTab) => void;
	exitFullscreen: () => void;
}

const agentLayoutStoreKey = "agent-layout.v1";

const normalizeAgentLayoutMode = (value: unknown): AgentLayoutMode =>
	value === "fullscreen" ? value : "fullscreen";

const normalizeAgentLayoutTab = (value: unknown): AgentLayoutTab =>
	value === "document" || value === "agent" ? value : "agent";

export const useAgentLayoutStore = create<AgentLayoutState>()(
	persist(
		immer((set) => ({
			mode: "fullscreen",
			tab: "document",
			dockGeometry: { width: 900, height: 640, x: 0, y: 0 },
			setDockGeometry: (geometry) =>
				set((state) => {
					state.dockGeometry = geometry;
				}),
			setMode: (mode) =>
				set((state) => {
					const nextMode = mode === "fullscreen" ? mode : "fullscreen";
					state.mode = nextMode;
				}),
			setTab: (tab) =>
				set((state) => {
					state.tab = tab;
				}),
			enterFullscreen: (tab = "agent") =>
				set((state) => {
					state.mode = "fullscreen";
					state.tab = tab;
				}),
			exitFullscreen: () =>
				set((state) => {
					state.mode = "fullscreen";
					state.tab = "document";
				}),
		})),
		{
			name: agentLayoutStoreKey,
			storage: createJSONStorage(() => localStorage),
			version: 1,
			partialize: (state) => ({
				mode: state.mode,
				tab: state.tab,
				dockGeometry: state.dockGeometry,
			}),
			merge: (persisted, current) => {
				const state =
					(persisted as
						| Partial<Pick<AgentLayoutState, "mode" | "tab" | "dockGeometry">>
						| undefined) ?? {};
				return {
					...current,
					mode: normalizeAgentLayoutMode(state.mode),
					tab: normalizeAgentLayoutTab(state.tab),
					dockGeometry:
						state.dockGeometry &&
						[
							state.dockGeometry.width,
							state.dockGeometry.height,
							state.dockGeometry.x,
							state.dockGeometry.y,
						].every(Number.isFinite)
							? state.dockGeometry
							: current.dockGeometry,
				};
			},
		},
	),
);
