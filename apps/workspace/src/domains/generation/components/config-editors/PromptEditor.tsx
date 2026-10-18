import { Textarea } from "@/shared/components/ui/textarea";

interface PromptEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

/**
 * 提示词编辑器
 */
export function PromptEditor({ value, onChange, placeholder }: PromptEditorProps) {
	return (
		<div className="space-y-2">
			<label className="text-sm font-medium">提示词</label>
			<Textarea
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder || "输入提示词..."}
				rows={4}
				className="resize-none font-mono text-sm"
			/>
			<div className="text-xs text-muted-foreground text-right">{value.length} 字符</div>
		</div>
	);
}
