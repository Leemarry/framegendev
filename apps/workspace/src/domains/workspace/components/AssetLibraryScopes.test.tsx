import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceProject } from "@/domains/projects/api/projects";
import { AssetLibraryScopes } from "./AssetLibraryScopes";

const project = (id: string, name: string) => ({ id, name }) as WorkspaceProject;

describe("asset library scopes", () => {
	it("filters the project list and reports the empty result", () => {
		render(
			<AssetLibraryScopes
				projectId={null}
				projects={[project("a", "星海"), project("b", "夜色")]}
				loading={false}
				onSelect={vi.fn()}
			/>,
		);

		fireEvent.change(screen.getByLabelText("搜索项目"), { target: { value: "星" } });

		expect(screen.getByRole("button", { name: "素材范围 星海" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "素材范围 夜色" })).not.toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("搜索项目"), { target: { value: "zzz" } });

		expect(screen.getByText("没有匹配的项目")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "素材范围 星海" })).not.toBeInTheDocument();
	});
});
