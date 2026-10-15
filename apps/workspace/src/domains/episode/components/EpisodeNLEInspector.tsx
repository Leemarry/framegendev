import { useState } from "react";
import type { TimelineClip, TimelineClipEdit } from "../lib/sample";
import { defaultClipEdit, frameTime, validateClipEdit } from "../lib/nle-editing";

interface Props {
	clip: TimelineClip;
	panel: "画面" | "音频" | "变速";
	sourceDuration?: number;
	onApply: (clip: TimelineClip) => void;
	audio?: boolean;
}

export function EpisodeNLEInspector({ clip, panel, sourceDuration, onApply, audio }: Props) {
	const [draft, setDraft] = useState(clip);
	const [error, setError] = useState("");
	const edit = { ...defaultClipEdit, ...draft.edit };
	const field = (
		label: string,
		key: keyof TimelineClipEdit,
		min: number,
		max: number,
		step: number,
	) => (
		<label className="nle-field" key={key}>
			<span>{label}</span>
			<input
				type="number"
				required
				min={min}
				max={max}
				step={step}
				value={edit[key]}
				onChange={(event) =>
					setDraft({ ...draft, edit: { ...edit, [key]: event.target.valueAsNumber } })
				}
			/>
		</label>
	);
	return (
		<form
			className="nle-form"
			onSubmit={(event) => {
				event.preventDefault();
				try {
					const next = { ...draft, start: frameTime(draft.start), end: frameTime(draft.end) };
					validateClipEdit(next, sourceDuration);
					onApply(next);
					setError("");
				} catch (err) {
					setError(err instanceof Error ? err.message : "参数更新失败");
				}
			}}
		>
			<label className="nle-field">
				<span>标题</span>
				<input
					required
					value={draft.title}
					onChange={(event) => setDraft({ ...draft, title: event.target.value })}
				/>
			</label>
			<label className="nle-field">
				<span>时长（秒）</span>
				<input
					required
					type="number"
					min={1 / 30}
					step="any"
					value={Number((draft.end - draft.start).toFixed(6))}
					onChange={(event) =>
						setDraft({ ...draft, end: draft.start + event.target.valueAsNumber })
					}
				/>
			</label>
			{audio && (
				<label className="nle-field">
					<span>开始（秒）</span>
					<input
						type="number"
						required
						min={0}
						max={86400}
						step="any"
						value={draft.start}
						onChange={(event) => {
							const start = event.target.valueAsNumber;
							setDraft({ ...draft, start, end: start + draft.end - draft.start });
						}}
					/>
				</label>
			)}
			{sourceDuration !== undefined && (
				<p className="text-xs text-muted-foreground">素材 {sourceDuration.toFixed(3)} s · 30 fps</p>
			)}
			{field("素材起点（秒）", "sourceIn", 0, sourceDuration ?? 86400, 1 / 30)}
			{!audio && panel === "画面" && (
				<>
					{field("水平位置", "x", -1, 1, 0.01)}
					{field("垂直位置", "y", -1, 1, 0.01)}
					{field("缩放", "scale", 0.1, 3, 0.01)}
					{field("旋转（度）", "rotation", -180, 180, 1)}
					{field("不透明度", "opacity", 0, 1, 0.01)}
				</>
			)}
			{(audio || panel === "音频") && field("音量", "volume", 0, 2, 0.01)}
			{(audio || panel === "变速") && field("播放速度", "speed", 0.25, 4, 0.05)}
			{error && (
				<p role="alert" className="text-xs text-error-foreground">
					{error}
				</p>
			)}
			<button className="nle-command" type="submit">
				应用参数
			</button>
		</form>
	);
}
