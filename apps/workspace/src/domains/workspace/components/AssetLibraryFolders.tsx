import { Check, Folder, FolderPlus, Loader2, PencilLine, X } from "lucide-react";
import { useState } from "react";
import type { AssetLibraryFolder } from "@/domains/workspace/api/library-folders";
import type { MediaAsset } from "@/domains/workspace/api/media";
import {
	libraryFolderNameError,
	libraryFolderOptions,
} from "@/domains/workspace/lib/library-folders";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";

export interface AssetLibraryFolderControls {
	folders: AssetLibraryFolder[];
	folderId: string;
	loading: boolean;
	error?: unknown;
	onNavigate: (id: string) => void;
	onCreate: () => void;
	onRename: (folder: AssetLibraryFolder) => void;
	onRefresh: () => Promise<unknown>;
}

export function AssetLibraryFolders({ controls }: { controls: AssetLibraryFolderControls }) {
	const [menuOpen, setMenuOpen] = useState(false);
	const select = (id: string) => {
		controls.onNavigate(id);
		setMenuOpen(false);
	};
	const current = controls.folders.find((folder) => folder.id === controls.folderId);
	const rows = (
		<nav aria-label="素材文件夹" className="asset-library-folder-list">
			<button
				type="button"
				className="asset-library-folder-row"
				aria-current={!controls.folderId ? "page" : undefined}
				onClick={() => select("")}
			>
				<Folder className="size-4 shrink-0" />
				<span>素材库根目录</span>
			</button>
			{libraryFolderOptions(controls.folders).map(({ folder, path }) => (
				<div
					key={folder.id}
					className="asset-library-folder-entry"
					style={{ paddingLeft: Math.min(path.length - 1, 6) * 12 }}
				>
					<button
						type="button"
						className="asset-library-folder-row"
						aria-current={folder.id === controls.folderId ? "page" : undefined}
						title={path.map((entry) => entry.name).join(" / ")}
						onClick={() => select(folder.id)}
					>
						<Folder className="size-4 shrink-0" />
						<span>{folder.name}</span>
					</button>
					<Button
						size="icon"
						variant="ghost"
						aria-label={`重命名文件夹 ${folder.name}`}
						title="重命名文件夹"
						onClick={() => {
							setMenuOpen(false);
							controls.onRename(folder);
						}}
					>
						<PencilLine className="size-3.5" />
					</Button>
				</div>
			))}
			{controls.loading ? (
				<p role="status" className="p-3 text-xs text-muted-foreground">
					正在加载文件夹
				</p>
			) : null}
			{controls.error ? (
				<p role="alert" className="p-3 text-xs text-error-foreground">
					文件夹加载失败
				</p>
			) : null}
		</nav>
	);
	const actions = (
		<div className="asset-library-folder-label">
			<span>文件夹</span>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				disabled={controls.loading || Boolean(controls.error)}
				aria-label="新建素材文件夹"
				title="新建素材文件夹"
				onClick={() => {
					setMenuOpen(false);
					controls.onCreate();
				}}
			>
				<FolderPlus className="size-4" />
			</Button>
		</div>
	);
	return (
		<>
			<div className="asset-library-folders-desktop">
				{actions}
				{rows}
			</div>
			<div className="asset-library-folders-mobile">
				<Popover open={menuOpen} onOpenChange={setMenuOpen}>
					<PopoverTrigger asChild>
						<Button variant="ghost" className="min-w-0 max-w-full" aria-label="选择素材文件夹">
							<Folder className="size-4 shrink-0" />
							<span className="truncate">
								{current?.name || (controls.folderId ? "文件夹不存在" : "素材库根目录")}
							</span>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="asset-library-folder-menu w-72 max-w-[calc(100vw-2rem)] p-2"
						align="end"
					>
						{actions}
						{rows}
					</PopoverContent>
				</Popover>
			</div>
		</>
	);
}

export function AssetLibraryFolderNameDialog({
	folder,
	parentName,
	onSave,
	onClose,
}: {
	folder?: AssetLibraryFolder;
	parentName: string;
	onSave: (name: string) => Promise<void>;
	onClose: () => void;
}) {
	const [name, setName] = useState(folder?.name || "");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (pending) return;
		const invalid = libraryFolderNameError(name);
		if (invalid) {
			setError(invalid);
			return;
		}
		setPending(true);
		setError("");
		try {
			await onSave(name.trim());
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "文件夹保存失败，请重试。");
		} finally {
			setPending(false);
		}
	};
	return (
		<AlertDialog
			open
			onOpenChange={(open) => {
				if (!open && !pending) onClose();
			}}
		>
			<AlertDialogContent
				className="max-w-sm"
				onEscapeKeyDown={(event) => {
					if (pending) event.preventDefault();
				}}
			>
				<form onSubmit={(event) => void submit(event)} className="grid gap-4">
					<AlertDialogTitle>{folder ? "重命名文件夹" : "新建文件夹"}</AlertDialogTitle>
					<AlertDialogDescription className="break-all">{parentName}</AlertDialogDescription>
					<label className="grid gap-2 text-sm">
						文件夹名称
						<Input
							autoFocus
							value={name}
							disabled={pending}
							onChange={(event) => setName(event.target.value)}
							aria-invalid={Boolean(error)}
							aria-describedby={error ? "folder-name-error" : undefined}
						/>
					</label>
					{error ? (
						<p id="folder-name-error" role="alert" className="text-xs text-error-foreground">
							{error}
						</p>
					) : null}
					<div className="flex justify-end gap-2">
						<Button variant="outline" type="button" disabled={pending} onClick={onClose}>
							<X className="size-4" />
							取消
						</Button>
						<Button type="submit" disabled={pending}>
							{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
							{folder ? "保存" : "创建"}
						</Button>
					</div>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function AssetLibraryMove({
	asset,
	folders,
	busy,
	onMove,
}: {
	asset: MediaAsset;
	folders: AssetLibraryFolder[];
	busy: boolean;
	onMove: (id: string) => Promise<void>;
}) {
	const [destination, setDestination] = useState(asset.folderId || "");
	const [error, setError] = useState("");
	const changed = destination !== (asset.folderId || "");
	const move = async () => {
		setError("");
		try {
			await onMove(destination);
		} catch (err) {
			setError(err instanceof Error ? err.message : "移动失败，请重试。");
		}
	};
	return (
		<div className="grid shrink-0 gap-2">
			<label className="text-xs text-muted-foreground" htmlFor="asset-folder-select">
				移动到
			</label>
			<Select
				value={destination || "__root__"}
				onValueChange={(id) => setDestination(id === "__root__" ? "" : id)}
				disabled={busy}
			>
				<SelectTrigger
					id="asset-folder-select"
					aria-label="移动到文件夹"
					className="w-full min-w-0"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent className="max-w-[calc(100vw-2rem)]">
					<SelectItem value="__root__">素材库根目录</SelectItem>
					{libraryFolderOptions(folders).map(({ folder, path }) => (
						<SelectItem
							key={folder.id}
							value={folder.id}
							className="min-w-0"
							title={path.map((entry) => entry.name).join(" / ")}
						>
							<span className="block max-w-[min(20rem,calc(100vw-4rem))] truncate">
								{path.map((entry) => entry.name).join(" / ")}
							</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{changed ? (
				<div className="flex gap-2">
					<Button size="sm" disabled={busy} onClick={() => void move()}>
						<Folder className="size-4" />
						移动
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={busy}
						onClick={() => {
							setDestination(asset.folderId || "");
							setError("");
						}}
					>
						取消
					</Button>
				</div>
			) : null}
			{error ? (
				<p role="alert" className="text-xs text-error-foreground">
					{error}
				</p>
			) : null}
		</div>
	);
}
