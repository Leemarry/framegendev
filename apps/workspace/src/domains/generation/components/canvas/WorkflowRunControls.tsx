import { useEffect, useRef, useState } from "react";
import { Play, Square, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { workflowRunPlan, workflowTopology } from "../../lib/workflow-run-plan";
import type { WorkflowGraph } from "../../lib/workflow-schema-v4";

type Run = {
	queue: string[];
	index: number;
	phase: "queued" | "running" | "awaiting" | "failed" | "completed" | "stopped";
	topology: string;
	error?: string;
};

/** The next provider request is sent only after the user confirms this step's output. */
export function WorkflowRunControls({
	graph,
	generate,
	focus,
	onActiveChange,
}: {
	graph: WorkflowGraph;
	generate: (id: string) => Promise<void>;
	focus: (id: string) => void;
	onActiveChange: (active: boolean) => void;
}) {
	const [run, setRun] = useState<Run | null>(null);
	const [error, setError] = useState("");
	const callbacks = useRef({ generate, focus });
	callbacks.current = { generate, focus };
	const submitting = useRef<string | null>(null);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const active = !!run && ["queued", "running", "awaiting"].includes(run.phase);
	useEffect(() => {
		onActiveChange(active);
	}, [active, onActiveChange]);
	const current = graph.nodes.find((node) => node.id === run?.queue[run.index]);
	useEffect(() => {
		if (!run || !["queued", "running"].includes(run.phase)) return;
		if (workflowTopology(graph) !== run.topology || !current) {
			setRun({ ...run, phase: "failed", error: "节点或连线已改变，请从头开始运行" });
			return;
		}
		if (run.phase === "queued") {
			if (submitting.current) return;
			const id = current.id;
			submitting.current = id;
			setRun({ ...run, phase: "running", error: undefined });
			callbacks.current.focus(id);
			void callbacks.current
				.generate(id)
				.catch((failure) => {
					if (mounted.current)
						setRun((value) =>
							value?.phase === "running"
								? { ...value, phase: "failed", error: String(failure) }
								: value,
						);
				})
				.finally(() => {
					submitting.current = null;
					if (mounted.current) setRun((value) => (value ? { ...value } : value));
				});
			return;
		}
		if (submitting.current) return;
		if (current.data.status === "succeeded") setRun({ ...run, phase: "awaiting" });
		else if (current.data.status === "failed")
			setRun({ ...run, phase: "failed", error: current.data.error || "节点生成失败" });
	}, [run, graph, current]);
	const start = () => {
		try {
			const queue = workflowRunPlan(graph);
			setError("");
			setRun({ queue, index: 0, phase: "queued", topology: workflowTopology(graph) });
		} catch (failure) {
			setError(failure instanceof Error ? failure.message : String(failure));
		}
	};
	const confirm = () => {
		if (!run || !current) return;
		if (workflowTopology(graph) !== run.topology) {
			setRun({ ...run, phase: "failed", error: "节点或连线已改变，请从头开始运行" });
			return;
		}
		if (
			!Object.values(current.data.outputs ?? {}).some(
				(output) => typeof output.value === "string" && output.value.trim(),
			)
		) {
			setError("当前节点没有可用输出");
			return;
		}
		setError("");
		setRun(
			run.index + 1 === run.queue.length
				? { ...run, phase: "completed" }
				: { ...run, index: run.index + 1, phase: "queued" },
		);
	};
	return (
		<div className="absolute left-4 top-4 z-20 w-80 max-w-[calc(100%-2rem)] rounded-lg border border-border bg-card/95 p-3 shadow-sm">
			<div className="flex items-center justify-between gap-2">
				<strong className="text-sm">工作流执行</strong>
				{!active && (
					<Button
						size="sm"
						variant="outline"
						disabled={graph.nodes.some((node) => node.data.status === "generating")}
						onClick={start}
					>
						<Play className="size-3" />
						{run ? "从头开始" : "逐步运行"}
					</Button>
				)}
				{active && (
					<Button
						size="sm"
						variant="ghost"
						onClick={() => {
							setRun((value) => (value ? { ...value, phase: "stopped" } : value));
						}}
					>
						<Square className="size-3" />
						停止后续步骤
					</Button>
				)}
			</div>
			{run && (
				<div className="mt-2 space-y-2 text-xs">
					<p role="status">
						{run.phase === "completed"
							? "所有步骤已确认完成"
							: run.phase === "stopped"
								? "已停止后续步骤，已提交的任务继续运行"
								: `${run.index + 1} / ${run.queue.length} · ${current?.data.label ?? "节点已删除"} · ${run.phase === "awaiting" ? "等待选择结果" : run.phase === "failed" ? "运行失败" : "生成中…"}`}
					</p>
					<ol className="max-h-32 space-y-1 overflow-auto">
						{run.queue.map((id, index) => (
							<li key={id}>
								<button
									onClick={() => callbacks.current.focus(id)}
									className="text-left hover:text-primary"
								>
									{index < run.index || run.phase === "completed" ? "✓" : `${index + 1}.`}{" "}
									{graph.nodes.find((node) => node.id === id)?.data.label ?? "节点已删除"}
								</button>
							</li>
						))}
					</ol>
					{run.error && (
						<p role="alert" className="text-error-foreground">
							{run.error}
						</p>
					)}
					{run.phase === "awaiting" && (
						<>
							<p>在节点中选择候选结果，再继续下一步。</p>
							<div className="flex gap-2">
								<Button size="sm" onClick={confirm}>
									使用所选并{run.index + 1 === run.queue.length ? "完成" : "继续"}
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setRun({ ...run, phase: "queued" })}
								>
									重新生成
								</Button>
							</div>
						</>
					)}
					{run.phase === "failed" && current && workflowTopology(graph) === run.topology && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => setRun({ ...run, phase: "queued", error: undefined })}
						>
							重试当前步骤
						</Button>
					)}
					{active && (
						<p className="text-muted-foreground">关闭画布会停止后续步骤，已提交任务仍会保留。</p>
					)}
					{!active && (
						<Button size="sm" variant="ghost" onClick={() => setRun(null)}>
							<X className="size-3" />
							收起
						</Button>
					)}
				</div>
			)}
			{error && (
				<p role="alert" className="mt-2 text-xs text-error-foreground">
					{error}
					<button aria-label="关闭运行提示" onClick={() => setError("")} className="ml-2">
						×
					</button>
				</p>
			)}
		</div>
	);
}
