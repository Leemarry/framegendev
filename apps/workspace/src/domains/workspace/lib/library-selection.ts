/**
 * Selection model for the asset library grid. Mirrors the official click
 * behaviour: shift extends from the last anchor, ctrl/cmd toggles one entry and
 * a plain click replaces the selection with the clicked item.
 */

export interface LibrarySelectionModifiers {
	ctrl: boolean;
	meta: boolean;
	shift: boolean;
}

export interface LibrarySelectionInput {
	anchorIndex: number;
	index: number;
	key: string;
	keys: readonly string[];
	modifiers: LibrarySelectionModifiers;
	selected: ReadonlySet<string>;
}

export interface LibrarySelectionResult {
	anchorIndex: number;
	selected: Set<string>;
}

export const librarySelectionClick = ({
	anchorIndex,
	index,
	key,
	keys,
	modifiers,
	selected,
}: LibrarySelectionInput): LibrarySelectionResult => {
	if (index < 0 || keys.length === 0) return { anchorIndex, selected: new Set(selected) };

	const rangeStart = Math.max(0, Math.min(anchorIndex, index));
	const rangeEnd = Math.min(keys.length - 1, Math.max(anchorIndex, index));
	if (modifiers.shift && anchorIndex >= 0) {
		const next = new Set<string>(modifiers.meta || modifiers.ctrl ? selected : []);
		for (let position = rangeStart; position <= rangeEnd; position += 1) {
			const entry = keys[position];
			if (entry) next.add(entry);
		}
		return { anchorIndex, selected: next };
	}

	if (modifiers.meta || modifiers.ctrl) {
		const next = new Set(selected);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		return { anchorIndex: index, selected: next };
	}

	return { anchorIndex: index, selected: new Set([key]) };
};

/** `Ctrl/Cmd+A` selects every visible item. */
export const selectAllLibraryKeys = (keys: readonly string[]) => new Set(keys);

/** Tags every selected asset shares, used by the bulk panel's tag editor. */
export const commonLibraryTags = (assets: readonly { tags?: string[] }[]) => {
	const [first, ...rest] = assets;
	if (!first?.tags?.length) return [];

	return first.tags.filter((tag) => rest.every((asset) => asset.tags?.includes(tag)));
};

/** Applies a tag diff while keeping each asset's remaining tags in order. */
export const applyLibraryTagDiff = (
	tags: readonly string[] | undefined,
	added: readonly string[],
	removed: readonly string[],
) => {
	const next = (tags ?? []).filter((tag) => !removed.includes(tag));
	for (const tag of added) {
		if (!next.includes(tag)) next.push(tag);
	}

	return next;
};
