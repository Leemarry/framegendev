import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { LegacyAssetLibraryRedirect } from "./routes";

const LocationProbe = () => {
	const location = useLocation();
	return <output data-testid="location-probe">{`${location.pathname}${location.search}`}</output>;
};

const renderRedirect = (entry: string) =>
	render(
		<MemoryRouter initialEntries={[entry]}>
			<Routes>
				<Route path="/assets" element={<LegacyAssetLibraryRedirect />} />
				<Route path="/library" element={<LocationProbe />} />
			</Routes>
		</MemoryRouter>,
	);

describe("asset library route", () => {
	afterEach(cleanup);

	it("moves legacy /assets links to /library and keeps the query", () => {
		renderRedirect("/assets?projectId=project-a&folderId=parent");

		expect(screen.getByTestId("location-probe")).toHaveTextContent(
			"/library?projectId=project-a&folderId=parent",
		);
	});

	it("keeps the global scope query when no project is selected", () => {
		renderRedirect("/assets?scope=all");

		expect(screen.getByTestId("location-probe")).toHaveTextContent("/library?scope=all");
	});
});
