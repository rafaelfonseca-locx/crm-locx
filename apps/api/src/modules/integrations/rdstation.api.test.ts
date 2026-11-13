import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({ prisma: {} }));

const { rdFunnelFor } = await import("./rdstation.api.js");

describe("rdFunnelFor", () => {
	it("leva a etapa do CRM para o funil do RD", () => {
		expect(rdFunnelFor({ stage: "NEW", status: "OPEN" })).toEqual({ lifecycle_stage: "Lead", opportunity: false });
		expect(rdFunnelFor({ stage: "QUALIFICATION", status: "OPEN" })).toEqual({
			lifecycle_stage: "Lead",
			opportunity: false,
		});
		expect(rdFunnelFor({ stage: "MEETING", status: "OPEN" })).toEqual({
			lifecycle_stage: "Qualified Lead",
			opportunity: true,
		});
		expect(rdFunnelFor({ stage: "TRIAL", status: "OPEN" })).toEqual({
			lifecycle_stage: "Qualified Lead",
			opportunity: true,
		});
		expect(rdFunnelFor({ stage: "CLOSING", status: "WON" })).toEqual({ lifecycle_stage: "Client", opportunity: true });
		expect(rdFunnelFor({ stage: "CLOSING", status: "LOST" })).toEqual({ lifecycle_stage: "Lead", opportunity: false });
	});
});
