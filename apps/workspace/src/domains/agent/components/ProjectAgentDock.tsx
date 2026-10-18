import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useAgentLayoutStore } from "@/lib/stores/agent-layout";
import { AgentPanel } from "./AgentPanel";

type Geometry = { width: number; height: number; x: number; y: number };
type Edge = "move" | "top" | "left" | "right" | "top-left" | "top-right";
const handles = [
	{ edge: "top", label: "调整 Drami 高度", className: "inset-x-3 top-0 h-1.5 cursor-ns-resize" },
	{
		edge: "left",
		label: "调整 Drami 左侧宽度",
		className: "left-0 top-1/2 h-24 w-1.5 -translate-y-1/2 cursor-ew-resize",
	},
	{
		edge: "right",
		label: "调整 Drami 右侧宽度",
		className: "right-0 top-1/2 h-24 w-1.5 -translate-y-1/2 cursor-ew-resize",
	},
	{
		edge: "top-left",
		label: "调整 Drami 左上角大小",
		className: "left-0 top-0 size-3 cursor-nwse-resize",
	},
	{
		edge: "top-right",
		label: "调整 Drami 右上角大小",
		className: "right-0 top-0 size-3 cursor-nesw-resize",
	},
] as const;

export function ProjectAgentDock() {
	const expanded = useAgentLayoutStore((state) => state.tab === "agent");
	const setTab = useAgentLayoutStore((state) => state.setTab);
	const savedGeometry = useAgentLayoutStore((state) => state.dockGeometry);
	const saveGeometry = useAgentLayoutStore((state) => state.setDockGeometry);
	const [geometry, setGeometry] = useState(savedGeometry);
	const [bounds, setBounds] = useState({ width: 1000, height: 800 });
	const sectionRef = useRef<HTMLElement>(null);
	const gesture = useRef<{ edge: Edge; x: number; y: number; geometry: Geometry } | null>(null);
	const setExpanded = useCallback((open: boolean) => setTab(open ? "agent" : "document"), [setTab]);

	useEffect(() => {
		const parent = sectionRef.current?.parentElement;
		if (!parent) return;
		const observer = new ResizeObserver(() =>
			setBounds({ width: parent.clientWidth, height: parent.clientHeight }),
		);
		observer.observe(parent);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!expanded) return;
		const closeOutside = (event: globalThis.PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Element) || sectionRef.current?.contains(target)) return;
			if (
				target.closest(
					'[role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper], .tippy-box',
				)
			)
				return;
			setExpanded(false);
		};
		const escape = (event: globalThis.KeyboardEvent) => {
			if (
				event.key !== "Escape" ||
				event.defaultPrevented ||
				document.querySelector(
					'[data-state="open"][role="dialog"], [role="menu"], [role="listbox"]',
				)
			)
				return;
			setExpanded(false);
			sectionRef.current?.querySelector<HTMLButtonElement>('[aria-label="打开 Drami"]')?.focus();
		};
		document.addEventListener("pointerdown", closeOutside);
		document.addEventListener("keydown", escape);
		return () => {
			document.removeEventListener("pointerdown", closeOutside);
			document.removeEventListener("keydown", escape);
		};
	}, [expanded, setExpanded]);

	const constrain = (value: Geometry): Geometry => {
		const width = Math.min(Math.max(320, value.width), Math.max(0, bounds.width - 32));
		const height = Math.min(Math.max(280, value.height), Math.max(0, bounds.height - 32));
		const horizontal = Math.max(0, (bounds.width - width) / 2 - 16);
		return {
			width,
			height,
			x: Math.max(-horizontal, Math.min(horizontal, value.x)),
			y: Math.max(Math.min(0, height + 32 - bounds.height), Math.min(0, value.y)),
		};
	};
	const visibleGeometry = constrain(geometry);
	const adjust = (base: Geometry, edge: Edge, dx: number, dy: number) =>
		constrain(
			edge === "move"
				? { ...base, x: base.x + dx, y: base.y + dy }
				: {
						...base,
						width:
							base.width + (edge.includes("left") ? -dx * 2 : edge.includes("right") ? dx * 2 : 0),
						height: base.height - (edge.includes("top") ? dy : 0),
					},
		);
	const begin = (event: PointerEvent<HTMLElement>, edge: Edge) => {
		if (
			!expanded ||
			event.button !== 0 ||
			(edge === "move" && (event.target as Element).closest("button"))
		)
			return;
		event.preventDefault();
		sectionRef.current?.setPointerCapture(event.pointerId);
		gesture.current = { edge, x: event.clientX, y: event.clientY, geometry: visibleGeometry };
	};
	const keyboard = (event: KeyboardEvent<HTMLElement>, edge: Edge) => {
		const delta = {
			ArrowLeft: [-16, 0],
			ArrowRight: [16, 0],
			ArrowUp: [0, -16],
			ArrowDown: [0, 16],
		}[event.key];
		if (!delta) return;
		event.preventDefault();
		const next = adjust(visibleGeometry, edge, delta[0], delta[1]);
		setGeometry(next);
		saveGeometry(next);
	};

	return (
		<section
			ref={sectionRef}
			aria-label="项目 Drami"
			role={expanded ? "dialog" : "region"}
			data-presentation={expanded ? "floating" : "collapsed"}
			className="project-agent-dock absolute inset-x-0 bottom-4 z-40 mx-auto flex flex-col rounded-xl border border-border bg-ide-panel shadow-xl"
			style={
				expanded
					? {
							width: visibleGeometry.width,
							height: visibleGeometry.height,
							transform: `translate(${visibleGeometry.x}px, ${visibleGeometry.y}px)`,
						}
					: {
							width: "max-content",
							minWidth: "min(16rem, calc(100% - 2rem))",
							maxWidth: "calc(100% - 2rem)",
							height: 48,
						}
			}
			onPointerMove={(event) => {
				const current = gesture.current;
				if (current)
					setGeometry(
						adjust(
							current.geometry,
							current.edge,
							event.clientX - current.x,
							event.clientY - current.y,
						),
					);
			}}
			onPointerUp={(event) => {
				if (!gesture.current) return;
				gesture.current = null;
				saveGeometry(visibleGeometry);
				event.currentTarget.releasePointerCapture(event.pointerId);
			}}
			onLostPointerCapture={() => {
				gesture.current = null;
			}}
		>
			<AgentPanel
				expanded={expanded}
				onExpandedChange={setExpanded}
				onHeaderPointerDown={(event) => begin(event, "move")}
				onHeaderKeyDown={(event) => keyboard(event, "move")}
			/>
			{expanded &&
				handles.map(({ edge, label, className }) => (
					<div
						key={edge}
						role="separator"
						aria-label={label}
						aria-orientation={edge === "top" ? "horizontal" : "vertical"}
						aria-valuenow={edge === "top" ? visibleGeometry.height : visibleGeometry.width}
						tabIndex={0}
						className={`absolute z-10 touch-none rounded-sm focus-visible:ring-2 focus-visible:ring-ring ${className}`}
						onPointerDown={(event) => begin(event, edge)}
						onKeyDown={(event) => keyboard(event, edge)}
					/>
				))}
		</section>
	);
}
