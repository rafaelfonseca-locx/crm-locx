import { describe, expect, it } from "vitest";
import { contractsBucket, mapStage, parseFullDate, parsePlan, parseShortDate } from "./import-handoff.js";

describe("importação do Handoff RE Patrimonial", () => {
	it("lê o plano e o ciclo", () => {
		expect(parsePlan("BASIC Anual")).toEqual({ plan: "Basic", billingCycle: "ANNUAL", value: 392 });
		expect(parsePlan("Pro anual, R$ 972/mês")).toEqual({ plan: "Pro", billingCycle: "ANNUAL", value: 972 });
		expect(parsePlan("ENTERPRISE")).toEqual({ plan: "Enterprise", billingCycle: null, value: null });
		expect(parsePlan(null).plan).toBeNull();
	});

	it("converte a carteira em faixa de holding", () => {
		expect(contractsBucket("30")).toBe("26 a 50");
		expect(contractsBucket("150")).toBe("Mais de 100");
		expect(contractsBucket("6 a 25")).toBe("6 a 25");
		expect(contractsBucket("5 holdings")).toBe("5 holdings");
	});

	it("mapeia a situação para etapa e status", () => {
		const base = { estagio: null, perda: null } as never;
		expect(mapStage({ ...(base as object), grupo: "demo" } as never)).toEqual({
			stage: "MEETING",
			status: "OPEN",
			lostReason: null,
		});
		expect(mapStage({ ...(base as object), grupo: "cliente" } as never).status).toBe("WON");
		expect(mapStage({ ...(base as object), grupo: "pausado", estagio: "PAUSADO" } as never)).toEqual({
			stage: "QUALIFICATION",
			status: "LOST",
			lostReason: "Pausado",
		});
		expect(
			mapStage({ ...(base as object), grupo: "perdido", perda: "Sem Contato", estagio: "PROD - Free Trial" } as never),
		).toEqual({
			stage: "TRIAL",
			status: "LOST",
			lostReason: "Sem resposta",
		});
	});

	it("deduz o ano das datas curtas a partir da chegada", () => {
		const arrival = parseFullDate("20/11/2025");
		expect(parseShortDate("05/01", arrival)?.toISOString().slice(0, 10)).toBe("2026-01-05");
		expect(parseShortDate("25/11", arrival)?.toISOString().slice(0, 10)).toBe("2025-11-25");
	});
});
