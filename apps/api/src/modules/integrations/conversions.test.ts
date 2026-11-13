import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({ prisma: {} }));

const { DEFAULT_LEAD_CONVERSIONS, isSalesConversion } = await import("./rdstation.service.js");

describe("isSalesConversion", () => {
	it("formulário de holding cria lead; os do corporativo não", () => {
		expect(isSalesConversion("formulario-lp-re_patrimonial", "SITE", DEFAULT_LEAD_CONVERSIONS)).toBe(true);
		expect(isSalesConversion("Formulario-LP-RE_Patrimonial", "SITE", DEFAULT_LEAD_CONVERSIONS)).toBe(true);
		expect(isSalesConversion("formulario-locxre", "SITE", DEFAULT_LEAD_CONVERSIONS)).toBe(false);
	});

	it("conversões de conteúdo não criam lead", () => {
		expect(isSalesConversion("download-ebook-gestao-patrimonial", "SITE", DEFAULT_LEAD_CONVERSIONS)).toBe(false);
		expect(isSalesConversion("calculadora-ipgm-holding", "SITE", DEFAULT_LEAD_CONVERSIONS)).toBe(false);
	});

	it("demonstração e WhatsApp sempre criam lead", () => {
		expect(isSalesConversion("agendou_demonstracao", "DEMO", [])).toBe(true);
		expect(isSalesConversion("botao-wpp-holding", "WHATSAPP", [])).toBe(true);
	});
});
