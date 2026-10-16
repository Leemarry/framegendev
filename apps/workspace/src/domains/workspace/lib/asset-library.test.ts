import { describe, expect, it } from "vitest";
import type { MarkdownDocument } from "@/domains/documents/stores";
import type { SelectedGenerationAsset } from "@/domains/generation/api/generation";
import type { MediaAsset } from "@/domains/workspace/api/media";

it("searches saved media tags and notes", () => {
	const items = buildAssetLibraryItems({
		mediaAssets: [mediaAsset({ tags: ["夜景"], note: "雨夜主角" })],
	});
	expect(filterAssetLibraryItems(items, { query: " 夜景 " })).toHaveLength(1);
	expect(filterAssetLibraryItems(items, { query: "雨夜" })).toHaveLength(1);
	expect(filterAssetLibraryItems(items, { query: "不存在" })).toHaveLength(0);
});
import {
	buildAssetLibraryItems,
	filterAssetLibraryItems,
	mediaAssetIdFromURL,
	normalizedAssetURL,
} from "./asset-library";

describe("asset-library", () => {
	it("filters saved tags independently and intersects other filters", () => {
		const items = buildAssetLibraryItems({
			mediaAssets: [
				mediaAsset({ id: "tagged", filename: "A.png", tags: ["Night scene"], rating: 5 }),
				mediaAsset({ id: "text-only", filename: "Night.png", tags: [], note: "Night scene" }),
				mediaAsset({ id: "unknown", filename: "B.png", tags: undefined }),
			],
		});
		expect(filterAssetLibraryItems(items, { tag: " NIGHT " }).map((item) => item.id)).toEqual([
			"tagged",
		]);
		expect(filterAssetLibraryItems(items, { tag: "night", query: "B.png" })).toHaveLength(0);
		expect(filterAssetLibraryItems(items, { tag: "night", kind: "audio" })).toHaveLength(0);
		expect(filterAssetLibraryItems(items, { tag: "night", rating: "5" })).toHaveLength(1);
		expect(filterAssetLibraryItems(items, { tag: "   " })).toHaveLength(3);
	});

	it("merges selected generated assets into matching media assets", () => {
		const items = buildAssetLibraryItems({
			mediaAssets: [
				mediaAsset({
					id: "media-a",
					url: "/api/v1/media-assets/media-a/content",
				}),
			],
			selectedAssets: [
				selectedAsset({
					id: "selected-a",
					resourceType: "character",
					taskId: "task-a",
					url: "/api/v1/media-assets/media-a/content",
				}),
			],
		});

		expect(items).toHaveLength(1);
		const mediaItem = items.find((item) => item.key === "media:media-a");
		expect(mediaItem?.selectedAssets.map((asset) => asset.id)).toEqual(["selected-a"]);
		expect(mediaItem?.selectedResourceTypes).toEqual(["character"]);
		expect(items.some((item) => item.key === "selected:selected-a")).toBe(false);
	});

	it("merges selected assets by explicit media asset id", () => {
		const items = buildAssetLibraryItems({
			mediaAssets: [
				mediaAsset({ id: "media-direct", url: "/api/v1/media-assets/media-direct/content" }),
			],
			selectedAssets: [
				selectedAsset({
					id: "selected-direct",
					mediaAssetId: "media-direct",
					resourceType: "character",
					url: "",
				}),
			],
		});

		expect(items).toHaveLength(1);
		expect(items[0].key).toBe("media:media-direct");
		expect(items[0].selectedAssets.map((asset) => asset.id)).toEqual(["selected-direct"]);
	});

	it("keeps unmatched selected generated assets as read-only items", () => {
		const items = buildAssetLibraryItems({
			selectedAssets: [
				selectedAsset({
					id: "selected-orphan",
					resourceType: "scene",
					title: "雨夜街角",
					url: "/api/v1/media-assets/missing/content",
				}),
			],
		});

		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			key: "selected:selected-orphan",
			sourceType: "selected",
			title: "雨夜街角",
			selectedResourceTypes: ["scene"],
		});
	});

	it("adds document category resource labels to matching media assets", () => {
		const items = buildAssetLibraryItems({
			documents: [
				document({ category: "character", id: "doc-character" }),
				document({ category: "scene", id: "doc-scene" }),
				document({ category: "prop", id: "doc-prop" }),
				document({ category: "storyboard", id: "doc-storyboard" }),
				document({ category: "screenplay", id: "doc-screenplay" }),
				document({ category: "reference", id: "doc-reference" }),
			],
			mediaAssets: [
				mediaAsset({
					id: "character-image",
					sectionId: "doc-character:section-a",
					url: "/api/v1/media-assets/character-image/content",
				}),
				mediaAsset({
					id: "screenplay-image",
					sectionId: "agent:project-a:section:doc-screenplay:section-b",
					url: "/api/v1/media-assets/screenplay-image/content",
				}),
				mediaAsset({
					id: "scene-image",
					sectionId: "doc-scene:section-c",
					url: "/api/v1/media-assets/scene-image/content",
				}),
				mediaAsset({
					id: "prop-image",
					sectionId: "doc-prop:section-d",
					url: "/api/v1/media-assets/prop-image/content",
				}),
				mediaAsset({
					id: "storyboard-image",
					sectionId: "doc-storyboard:section-e",
					url: "/api/v1/media-assets/storyboard-image/content",
				}),
				mediaAsset({
					id: "reference-image",
					conversationId: "section:doc-reference:section-c",
					url: "/api/v1/media-assets/reference-image/content",
				}),
			],
		});

		expect(items.find((item) => item.id === "character-image")?.selectedResourceTypes).toEqual([
			"character",
		]);
		expect(items.find((item) => item.id === "screenplay-image")?.selectedResourceTypes).toEqual([
			"screenplay",
		]);
		expect(items.find((item) => item.id === "scene-image")?.selectedResourceTypes).toEqual([
			"scene",
		]);
		expect(items.find((item) => item.id === "prop-image")?.selectedResourceTypes).toEqual(["prop"]);
		expect(items.find((item) => item.id === "storyboard-image")?.selectedResourceTypes).toEqual([
			"storyboard",
		]);
		expect(items.find((item) => item.id === "reference-image")?.selectedResourceTypes).toEqual([
			"reference",
		]);
		expect(
			filterAssetLibraryItems(items, { resourceType: "reference" }).map((item) => item.id),
		).toEqual(["reference-image"]);
	});

	it("deduplicates document and selected resource labels", () => {
		const items = buildAssetLibraryItems({
			documents: [document({ category: "character", id: "doc-character" })],
			mediaAssets: [
				mediaAsset({
					id: "character-image",
					sectionId: "doc-character:section-a",
					url: "/api/v1/media-assets/character-image/content",
				}),
			],
			selectedAssets: [
				selectedAsset({
					mediaAssetId: "character-image",
					resourceType: "character",
					url: "",
				}),
			],
		});

		expect(items[0].selectedResourceTypes).toEqual(["character"]);
	});

	it("filters by kind, source, resource type, and query", () => {
		const items = buildAssetLibraryItems({
			mediaAssets: [
				mediaAsset({
					filename: "Hero still.png",
					id: "hero",
					kind: "image",
					url: "/api/v1/media-assets/hero/content",
				}),
				mediaAsset({
					filename: "Audio take.wav",
					id: "audio",
					kind: "audio",
					url: "/api/v1/media-assets/audio/content",
				}),
			],
			selectedAssets: [
				selectedAsset({
					resourceType: "prop",
					taskId: "task-prop",
					url: "/api/v1/media-assets/hero/content",
				}),
			],
		});

		expect(filterAssetLibraryItems(items, { kind: "image" }).map((item) => item.id)).toEqual([
			"hero",
		]);
		expect(filterAssetLibraryItems(items, { source: "media" })).toHaveLength(2);
		expect(filterAssetLibraryItems(items, { source: "selected" }).map((item) => item.id)).toEqual([
			"hero",
		]);
		expect(filterAssetLibraryItems(items, { resourceType: "prop" }).map((item) => item.id)).toEqual(
			["hero"],
		);
		expect(filterAssetLibraryItems(items, { query: "audio" }).map((item) => item.id)).toEqual([
			"audio",
		]);
	});

	it("normalizes media content urls", () => {
		expect(mediaAssetIdFromURL("/api/v1/media-assets/media%20a/content")).toBe("media a");
		expect(mediaAssetIdFromURL("http://127.0.0.1:48273/api/v1/media-assets/media-b/content")).toBe(
			"media-b",
		);
		expect(normalizedAssetURL("http://127.0.0.1:48273/api/v1/media-assets/media-b/content")).toBe(
			"/api/v1/media-assets/media-b/content",
		);
	});

	it("sorts by rating descending with fallback for equal and unrated items", () => {
		const items = buildAssetLibraryItems({
			mediaAssets: [
				mediaAsset({ id: "unrated", filename: "unrated.png" }),
				mediaAsset({ id: "high", rating: 5 }),
				mediaAsset({ id: "low", rating: 1 }),
				mediaAsset({ id: "mid", rating: 3 }),
			],
		});

		expect(filterAssetLibraryItems(items, { sort: "ratingDesc" }).map((item) => item.id)).toEqual([
			"high",
			"mid",
			"low",
			"unrated",
		]);
	});

	it("filters items by rating thresholds and rated state", () => {
		const items = buildAssetLibraryItems({
			mediaAssets: [
				mediaAsset({ id: "unrated" }),
				mediaAsset({ id: "one", rating: 1 }),
				mediaAsset({ id: "three", rating: 3 }),
				mediaAsset({ id: "five", rating: 5 }),
			],
		});

		expect(filterAssetLibraryItems(items, { rating: "all" })).toHaveLength(4);
		expect(filterAssetLibraryItems(items, { rating: "rated" }).map((item) => item.id)).toEqual([
			"five",
			"one",
			"three",
		]);
		expect(filterAssetLibraryItems(items, { rating: "3" }).map((item) => item.id)).toEqual([
			"five",
			"three",
		]);
		expect(filterAssetLibraryItems(items, { rating: "5" }).map((item) => item.id)).toEqual([
			"five",
		]);
		expect(filterAssetLibraryItems(items, { rating: "5", kind: "text" })).toHaveLength(0);
	});
});

const mediaAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
	createdAt: "2026-06-01T08:00:00Z",
	filename: "media.png",
	id: "media-a",
	kind: "image",
	mimeType: "image/png",
	sizeBytes: 1024,
	updatedAt: "2026-06-01T09:00:00Z",
	url: "/api/v1/media-assets/media-a/content",
	...overrides,
});

const document = (overrides: Partial<MarkdownDocument> = {}): MarkdownDocument => ({
	category: "screenplay",
	comments: [],
	content: "",
	id: "doc-a",
	isDirty: false,
	parentId: null,
	sortOrder: 0,
	title: "文档",
	updatedAt: "2026-06-01T09:00:00Z",
	version: 1,
	workbenchDraft: null,
	...overrides,
});

const selectedAsset = (
	overrides: Partial<SelectedGenerationAsset> = {},
): SelectedGenerationAsset => ({
	assetIndex: 0,
	createdAt: "2026-06-01T10:00:00Z",
	id: "selected-a",
	kind: "image",
	mimeType: "image/png",
	resourceType: "character",
	taskId: "task-a",
	title: "selected image",
	updatedAt: "2026-06-01T10:30:00Z",
	url: "/api/v1/media-assets/media-a/content",
	...overrides,
});
