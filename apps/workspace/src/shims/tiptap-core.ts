import * as core from "../../node_modules/@tiptap/core/dist/index.js";

export * from "../../node_modules/@tiptap/core/dist/index.js";

type BlockPosition = {
	depth: number;
	nodeBefore: unknown;
	index: (depth: number) => number;
	node: (depth: number) => { child: (index: number) => unknown };
};

/** Compatibility export for newer list extensions running with the pinned core package. */
export function getPreviousBlockSibling(position: BlockPosition): unknown {
	if (position.nodeBefore) return position.nodeBefore;
	for (let depth = position.depth; depth > 0; depth -= 1) {
		const index = position.index(depth);
		if (index > 0) return position.node(depth).child(index - 1);
	}
	return null;
}

export default core;
