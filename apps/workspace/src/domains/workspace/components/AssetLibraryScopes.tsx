import { Folder, LibraryBig } from "lucide-react";
import { useState } from "react";
import type { WorkspaceProject } from "@/domains/projects/api/projects";
import { Input } from "@/shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";

export function AssetLibraryScopes({
	projectId,
	projects,
	loading,
	error,
	onSelect,
}: {
	projectId: string | null;
	projects: WorkspaceProject[];
	loading: boolean;
	error?: unknown;
	onSelect: (projectId: string | null) => void;
}) {
	const [query, setQuery] = useState("");
	const normalizedQuery = query.trim().toLocaleLowerCase();
	const visibleProjects = normalizedQuery
		? projects.filter((project) => project.name.toLocaleLowerCase().includes(normalizedQuery))
		: projects;

	return (
		<>
			<nav aria-label="素材范围" className="asset-library-scopes-desktop">
				<div className="asset-library-scope-label">素材范围</div>
				<button
					type="button"
					className="asset-library-folder-row"
					aria-current={!projectId ? "page" : undefined}
					onClick={() => onSelect(null)}
				>
					<LibraryBig className="size-4 shrink-0" />
					<span>全局素材</span>
				</button>
				<div className="asset-library-scope-projects">
					<Input
						aria-label="搜索项目"
						placeholder="搜索项目"
						className="mb-1 h-7 text-xs"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
					{visibleProjects.map((project) => (
						<button
							key={project.id}
							type="button"
							className="asset-library-folder-row"
							aria-label={`素材范围 ${project.name}`}
							aria-current={project.id === projectId ? "page" : undefined}
							title={project.name}
							onClick={() => onSelect(project.id)}
						>
							<Folder className="size-4 shrink-0" />
							<span>{project.name}</span>
						</button>
					))}
				</div>
				{normalizedQuery && visibleProjects.length === 0 ? (
					<p role="status" className="p-2 text-xs text-muted-foreground">
						没有匹配的项目
					</p>
				) : null}
				{loading ? (
					<p role="status" className="p-2 text-xs text-muted-foreground">
						正在加载素材范围
					</p>
				) : null}
				{error ? (
					<p role="alert" className="p-2 text-xs text-error-foreground">
						项目加载失败
					</p>
				) : null}
			</nav>
			<div className="asset-library-scopes-mobile">
				<Select
					value={projectId || "__global__"}
					onValueChange={(value) => onSelect(value === "__global__" ? null : value)}
				>
					<SelectTrigger aria-label="素材范围" className="w-full min-w-0">
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="max-w-[calc(100vw-2rem)]">
						<SelectItem value="__global__">全局素材</SelectItem>
						{visibleProjects.map((project) => (
							<SelectItem key={project.id} value={project.id}>
								<span className="block max-w-[min(20rem,calc(100vw-4rem))] truncate">
									{project.name}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{error ? (
					<p role="alert" className="mt-1 text-xs text-error-foreground">
						项目加载失败
					</p>
				) : null}
			</div>
		</>
	);
}
