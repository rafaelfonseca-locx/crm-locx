import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({ prisma: {} }));

const { buildChecklist } = await import("./trials.routes.js");

describe("buildChecklist", () => {
	it("distribui o roteiro ao longo de um trial de 7 dias", () => {
		expect(buildChecklist(7).map((i) => i.dayOffset)).toEqual([0, 1, 3, 6, 7]);
	});

	it("distribui o roteiro ao longo de um trial de 5 dias sem repetir dias", () => {
		const days = buildChecklist(5).map((i) => i.dayOffset);
		expect(days).toEqual([0, 1, 2, 4, 5]);
		expect(new Set(days).size).toBe(days.length);
	});

	it("numera as posições em ordem", () => {
		expect(buildChecklist(6).map((i) => i.position)).toEqual([0, 1, 2, 3, 4]);
	});
});
