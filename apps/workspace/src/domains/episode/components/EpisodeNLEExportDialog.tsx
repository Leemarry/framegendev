import * as Dialog from "@radix-ui/react-dialog";
import { Download, X } from "lucide-react";
import { useState } from "react";
import type {
	ExportWorkspaceEpisodeJianyingDraftRequest,
	ExportWorkspaceEpisodeJianyingDraftResponse,
} from "@/domains/workspace/api/workspace";

export function EpisodeNLEExportDialog({
	initialRoot,
	title,
	onExport,
	onClose,
}: {
	initialRoot: string;
	title: string;
	onExport: (
		request: ExportWorkspaceEpisodeJianyingDraftRequest,
	) => Promise<ExportWorkspaceEpisodeJianyingDraftResponse>;
	onClose: () => void;
}) {
	const [root, setRoot] = useState(initialRoot);
	const [name, setName] = useState(`${title}-${Date.now()}`);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState<ExportWorkspaceEpisodeJianyingDraftResponse | null>(null);
	return (
		<Dialog.Root
			open
			onOpenChange={(open) => {
				if (!open && !busy) onClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="nle-confirm-overlay" />
				<Dialog.Content
					className="nle-confirm"
					aria-describedby={undefined}
					onEscapeKeyDown={(event) => {
						if (busy) event.preventDefault();
					}}
					onPointerDownOutside={(event) => event.preventDefault()}
				>
					<div className="mb-4 flex items-center justify-between">
						<Dialog.Title>导出剪映草稿</Dialog.Title>
						<Dialog.Close className="nle-icon" disabled={busy} aria-label="关闭导出" title="关闭">
							<X size={16} />
						</Dialog.Close>
					</div>
					<form
						className="nle-form"
						onSubmit={async (event) => {
							event.preventDefault();
							setBusy(true);
							setError("");
							setResult(null);
							try {
								setResult(
									await onExport({
										draftsRoot: root.trim(),
										draftName: name.trim(),
										copyMedia: true,
										replaceExisting: false,
									}),
								);
							} catch (err) {
								setError(
									typeof err === "object" && err && "message" in err
										? String(err.message)
										: "导出失败，请重试",
								);
							} finally {
								setBusy(false);
							}
						}}
					>
						<label className="nle-field">
							<span>草稿目录</span>
							<input
								required
								value={root}
								disabled={busy}
								onChange={(e) => setRoot(e.target.value)}
							/>
						</label>
						<label className="nle-field">
							<span>草稿名称</span>
							<input
								required
								value={name}
								disabled={busy}
								onChange={(e) => setName(e.target.value)}
							/>
						</label>
						{error && (
							<p role="alert" className="text-xs text-error-foreground">
								{error}
							</p>
						)}
						{result && (
							<div role="status" className="break-all text-xs">
								<p>
									已导出 {result.shotCount} 个分镜 · {(result.durationMicros / 1000000).toFixed(3)}{" "}
									s
								</p>
								<p className="mt-2">{result.draftPath}</p>
							</div>
						)}
						<div className="flex justify-end gap-2">
							<Dialog.Close className="nle-command" disabled={busy}>
								关闭
							</Dialog.Close>
							<button className="nle-command" type="submit" disabled={busy}>
								<Download size={15} />
								{busy ? "导出中" : "导出"}
							</button>
						</div>
					</form>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
