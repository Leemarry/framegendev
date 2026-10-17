import { ChevronRight } from "lucide-react";
import type React from "react";
import { cn } from "@/shared/lib/utils";

/** Classes shared by every root sidebar navigation row (matches official 0.1.17). */
export const sidebarNavRowClassName =
	"flex h-8 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm text-ide-sidebar-foreground transition-colors hover:bg-ide-list-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

/** Active-state classes for a root sidebar navigation row. */
export const sidebarNavRowActiveClassName = "bg-ide-list-active text-foreground";

/** SidebarNavContent renders the icon, label and trailing chevron of a navigation row. */
export const SidebarNavContent: React.FC<{ icon: React.ReactNode; label: string }> = ({
	icon,
	label,
}) => (
	<>
		<span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
			{icon}
		</span>
		<span className="min-w-0 flex-1 truncate">{label}</span>
		<ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
	</>
);

/** SidebarNavButton is a root sidebar navigation row rendered as a button. */
export const SidebarNavButton: React.FC<
	Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
		active?: boolean;
		icon: React.ReactNode;
		label: string;
	}
> = ({ active = false, className, icon, label, ...props }) => (
	<button
		type="button"
		aria-current={active ? "page" : undefined}
		{...props}
		className={cn(sidebarNavRowClassName, active && sidebarNavRowActiveClassName, className)}
	>
		<SidebarNavContent icon={icon} label={label} />
	</button>
);
