import type { MenuItemConstructorOptions } from "electron";
import type { DesktopMenuCommand } from "./ipc-contract.js";

export function applicationMenuTemplate({
	command,
	about,
	development,
}: {
	command: (command: DesktopMenuCommand) => void;
	about: () => void;
	development: boolean;
}): MenuItemConstructorOptions[] {
	return [
		{
			label: "文件",
			submenu: [
				{ role: "close", label: "关闭窗口" },
				{ type: "separator" },
				{ role: "quit", label: "退出" },
			],
		},
		{
			label: "编辑",
			submenu: [
				{ role: "undo", label: "撤销" },
				{ role: "redo", label: "重做" },
				{ type: "separator" },
				{ role: "cut", label: "剪切" },
				{ role: "copy", label: "复制" },
				{ role: "paste", label: "粘贴" },
				{ role: "pasteAndMatchStyle", label: "粘贴并匹配样式" },
				{ role: "delete", label: "删除" },
				{ role: "selectAll", label: "全选" },
			],
		},
		{
			label: "视图",
			submenu: [
				{ role: "reload", label: "重新加载" },
				{ role: "forceReload", label: "强制重新加载" },
				...(development ? [{ role: "toggleDevTools" as const, label: "开发者工具" }] : []),
				{ type: "separator" },
				{ role: "resetZoom", label: "实际大小" },
				{ role: "zoomIn", label: "放大" },
				{ role: "zoomOut", label: "缩小" },
				{ type: "separator" },
				{ role: "togglefullscreen", label: "全屏" },
			],
		},
		{
			label: "工具",
			submenu: [
				{ label: "软件设置", accelerator: "CmdOrCtrl+,", click: () => command("settings") },
				{ label: "快捷键", click: () => command("shortcuts") },
			],
		},
		{
			label: "窗口",
			submenu: [
				{ role: "minimize", label: "最小化" },
				{ role: "zoom", label: "缩放窗口" },
			],
		},
		{
			label: "帮助",
			submenu: [
				{ label: "应用更新", click: () => command("updates") },
				{ type: "separator" },
				{ label: "关于 MediaGo Drama", click: about },
			],
		},
	];
}
