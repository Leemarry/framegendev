import { useState } from "react";
import type { TimelineClip } from "../lib/sample";
import { frameTime, validateClipEdit } from "../lib/nle-editing";

export function EpisodeNLECaptionInspector({
	clip,
	onApply,
}: {
	clip: TimelineClip;
	onApply: (clip: TimelineClip) => void;
}) {
	const [draft, setDraft] = useState(clip);
	const [error, setError] = useState("");
	return (
		<form
			className="nle-form"
			onSubmit={(event) => {
				event.preventDefault();
				try {
					const next = {
						...draft,
						start: frameTime(draft.start),
						end: frameTime(draft.end),
						title: draft.content.slice(0, 24),
					};
					if (!next.content.trim()) throw new Error("字幕不能为空");
					validateClipEdit(next);
					onApply(next);
					setError("");
				} catch (err) {
					setError(err instanceof Error ? err.message : "字幕更新失败");
				}
			}}
		>
			<label className="nle-field">
				<span>字幕文字</span>
				<textarea
					required
					maxLength={2000}
					value={draft.content}
					onChange={(e) => setDraft({ ...draft, content: e.target.value })}
				/>
			</label>
			{(["start", "end"] as const).map((key) => (
				<label className="nle-field" key={key}>
					<span>{key === "start" ? "开始（秒）" : "结束（秒）"}</span>
					<input
						type="number"
						required
						min={0}
						max={86400}
						step="any"
						value={draft[key]}
						onChange={(e) => setDraft({ ...draft, [key]: e.target.valueAsNumber })}
					/>
				</label>
			))}
			{error && (
				<p role="alert" className="text-xs text-error-foreground">
					{error}
				</p>
			)}
			<button type="submit" className="nle-command">
				应用字幕
			</button>
		</form>
	);
}
