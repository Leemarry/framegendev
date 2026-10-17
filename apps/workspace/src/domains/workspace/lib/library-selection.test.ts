import { describe, expect, it } from "vitest";
import {
	applyLibraryTagDiff,
	commonLibraryTags,
	librarySelectionClick,
	selectAllLibraryKeys,
} from "./library-selection";

const keys = ["a", "b", "c", "d"];
const none = new Set<string>();

describe("library selection click", () => {
	it("selects one item on a plain click and moves the anchor", () => {
		const result = librarySelectionClick({
			anchorIndex: -1,
			index: 2,
			key: "c",
			keys,
			modifiers: { ctrl: false, meta: false, shift: false },
			selected: new Set(["a", "b"]),
		});

		expect([...result.selected]).toEqual(["c"]);
		expect(result.anchorIndex).toBe(2);
	});

	it("toggles one item with ctrl or cmd without dropping the rest", () => {
		const added = librarySelectionClick({
			anchorIndex: 0,
			index: 3,
			key: "d",
			keys,
			modifiers: { ctrl: true, meta: false, shift: false },
			selected: new Set(["a"]),
		});
		expect([...added.selected]).toEqual(["a", "d"]);
		expect(added.anchorIndex).toBe(3);

		const removed = librarySelectionClick({
			anchorIndex: 0,
			index: 0,
			key: "a",
			keys,
			modifiers: { ctrl: false, meta: true, shift: false },
			selected: new Set(["a", "d"]),
		});
		expect([...removed.selected]).toEqual(["d"]);
	});

	it("extends a range from the anchor when shift is held", () => {
		const forward = librarySelectionClick({
			anchorIndex: 1,
			index: 3,
			key: "d",
			keys,
			modifiers: { ctrl: false, meta: false, shift: true },
			selected: new Set(["b"]),
		});
		expect([...forward.selected]).toEqual(["b", "c", "d"]);
		expect(forward.anchorIndex).toBe(1);

		const backward = librarySelectionClick({
			anchorIndex: 3,
			index: 1,
			key: "b",
			keys,
			modifiers: { ctrl: false, meta: false, shift: true },
			selected: new Set(["d"]),
		});
		expect([...backward.selected]).toEqual(["b", "c", "d"]);
	});

	it("adds the range to the existing selection when ctrl is held with shift", () => {
		const result = librarySelectionClick({
			anchorIndex: 2,
			index: 3,
			key: "d",
			keys,
			modifiers: { ctrl: true, meta: false, shift: true },
			selected: new Set(["a"]),
		});

		expect([...result.selected].sort()).toEqual(["a", "c", "d"]);
	});

	it("falls back to a single selection when no anchor exists yet", () => {
		const result = librarySelectionClick({
			anchorIndex: -1,
			index: 2,
			key: "c",
			keys,
			modifiers: { ctrl: false, meta: false, shift: true },
			selected: none,
		});

		expect([...result.selected]).toEqual(["c"]);
		expect(result.anchorIndex).toBe(2);
	});

	it("ignores clicks that do not map to a visible item", () => {
		const result = librarySelectionClick({
			anchorIndex: 0,
			index: -1,
			key: "gone",
			keys,
			modifiers: { ctrl: true, meta: false, shift: false },
			selected: new Set(["a"]),
		});

		expect([...result.selected]).toEqual(["a"]);
		expect(result.anchorIndex).toBe(0);
	});

	it("selects every visible key for select-all", () => {
		expect([...selectAllLibraryKeys(keys)]).toEqual(keys);
	});
});

describe("bulk tag helpers", () => {
	it("keeps only tags shared by every selected asset", () => {
		expect(commonLibraryTags([{ tags: ["夜景", "人物"] }, { tags: ["夜景"] }])).toEqual(["夜景"]);
		expect(commonLibraryTags([{ tags: [] }, { tags: ["夜景"] }])).toEqual([]);
		expect(commonLibraryTags([])).toEqual([]);
	});

	it("applies a tag diff without reordering the remaining tags", () => {
		expect(applyLibraryTagDiff(["a", "b", "c"], ["d"], ["b"])).toEqual(["a", "c", "d"]);
		expect(applyLibraryTagDiff(undefined, ["a"], [])).toEqual(["a"]);
		expect(applyLibraryTagDiff(["a"], ["a"], [])).toEqual(["a"]);
	});
});
