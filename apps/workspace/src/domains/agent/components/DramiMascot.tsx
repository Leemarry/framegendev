import { useId } from "react";
import { cn } from "@/shared/lib/utils";

export function DramiMascot({
	className,
	working = false,
}: {
	className?: string;
	working?: boolean;
}) {
	const gradient = useId();
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 80 80"
			className={cn(
				"shrink-0 overflow-visible",
				working && "animate-pulse motion-reduce:animate-none",
				className,
			)}
		>
			<defs>
				<linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
					<stop stopColor="var(--drami-face-light)" />
					<stop offset="0.55" stopColor="var(--drami-face-mid)" />
					<stop offset="1" stopColor="var(--drami-face-dark)" />
				</linearGradient>
			</defs>
			<circle cx="40" cy="40" r="35" fill={`url(#${gradient})`} />
			<g fill="var(--drami-eye)" transform="rotate(-24 49 27)">
				<rect x="43" y="20" width="5" height="13" rx="2.5" />
				<rect x="56" y="20" width="4" height="12" rx="2" />
			</g>
		</svg>
	);
}
