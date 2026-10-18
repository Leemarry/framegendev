import { Image, Video, Music, FileText, Download } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import { useWorkflowOutputs } from "../../api/workflow";
import { apiResourceURL } from "@/shared/lib/api-base";

interface Props {
	workflowId: string;
	nodeId: string;
	className?: string;
}

const assetTypeIcons: Record<string, React.ReactNode> = {
	image: <Image className="h-4 w-4" />,
	video: <Video className="h-4 w-4" />,
	audio: <Music className="h-4 w-4" />,
	text: <FileText className="h-4 w-4" />,
};

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function WorkflowNodeOutputs({ workflowId, nodeId, className }: Props) {
	const { data, error, isLoading } = useWorkflowOutputs(workflowId, nodeId);

	if (isLoading) {
		return (
			<Card className={cn("border-border", className)}>
				<CardContent className="pt-6">
					<div className="text-sm text-muted-foreground">加载中...</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className={cn("border-border", className)}>
				<CardContent className="pt-6">
					<div className="text-sm text-destructive">加载失败: {String(error)}</div>
				</CardContent>
			</Card>
		);
	}

	const assets = data?.assets ?? [];

	return (
		<Card className={cn("border-border", className)}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-base">节点输出</CardTitle>
						<CardDescription className="mt-1">
							{assets.length === 0 ? "暂无输出" : `${assets.length} 个文件`}
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			{assets.length > 0 && (
				<CardContent>
					<ScrollArea className="h-[300px]">
						<div className="space-y-3">
							{assets.map((asset) => {
								const isImage = asset.assetType === "image";
								const isVideo = asset.assetType === "video";
								const url = apiResourceURL(asset.assetPath);

								return (
									<div
										key={asset.id}
										className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
									>
										<div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-background">
											{isImage && (
												<img
													src={url}
													alt={asset.assetPath}
													className="w-full h-full object-cover"
												/>
											)}
											{isVideo && (
												<video
													src={url}
													className="w-full h-full object-cover"
													muted
													loop
													playsInline
												/>
											)}
											{!isImage && !isVideo && (
												<div className="w-full h-full flex items-center justify-center text-muted-foreground">
													{assetTypeIcons[asset.assetType] ?? <FileText className="h-6 w-6" />}
												</div>
											)}
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<Badge variant="outline" className="text-xs">
													{asset.assetType}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{formatBytes(asset.sizeBytes)}
												</span>
											</div>
											<p className="text-sm font-mono truncate" title={asset.assetPath}>
												{asset.assetPath.split("/").pop()}
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												{new Date(asset.createdAt).toLocaleString()}
											</p>
										</div>

										<Button size="sm" variant="ghost" asChild className="flex-shrink-0">
											<a href={url} download target="_blank" rel="noopener noreferrer">
												<Download className="h-4 w-4" />
											</a>
										</Button>
									</div>
								);
							})}
						</div>
					</ScrollArea>
				</CardContent>
			)}
		</Card>
	);
}
