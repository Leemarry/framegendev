import { useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { DocumentHistoryVersion } from "@/domains/workspace/api/workspace";
import { createMarkdownParsingExtensions } from "./MarkdownHybridEditor";
import { DocumentMention } from "./extensions/document-mention";

export const DocumentHistorySnapshot = ({
	version,
	source,
}: {
	version: DocumentHistoryVersion;
	source: boolean;
}) =>
	source ? (
		<pre
			aria-label="历史版本源文件"
			className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-6 [overflow-wrap:anywhere]"
		>
			{version.content}
		</pre>
	) : (
		<HistoryReadingContent value={version.content} />
	);

const HistoryReadingContent = ({ value }: { value: string }) => {
	const extensions = useMemo(() => createMarkdownParsingExtensions([DocumentMention]), []);
	const editor = useEditor(
		{
			extensions,
			content: value,
			contentType: "markdown",
			editable: false,
			immediatelyRender: false,
			editorProps: {
				attributes: {
					"aria-label": "历史版本正文",
					class: "tiptap-content min-w-0 outline-none [overflow-wrap:anywhere]",
				},
			},
		},
		[value],
	);
	return <EditorContent className="p-4" editor={editor} />;
};
