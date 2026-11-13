import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({ prisma: {} }));

const { DEFAULT_LEAD_CONVERSIONS, isSalesConversion } = await import("./rdstation.service.js");

describe("isSalesConversion", () => {
	it("formulários de venda criam lead", () => {
		expect(isSalesConversion("formulario-homepage", "SITE", DEFAULT_LEAD_CONVERSIONS)).toBe(true);
		expect(isSalesConversion("Formulario-LocXRE-Rodape", "SITE", DEFAULT_LEAD_CONVERSIONS)).toBe(true);
	});

	it("conversões de conteúdo não criam lead", () => {
		expect(isSalesConversion("download-ebook-gestao-patrimonial", "SITE", DEFAULT_LEAD_CONVERSIONS)).toBe(false);
		expect(isSalesConversion("calculadora-ipgm-holding", "SITE", DEFAULT_LEAD_CONVERSIONS)).toBe(false);
	});

	it("demonstração e WhatsApp sempre criam lead", () => {
		expect(isSalesConversion("agendar-demonstracao", "DEMO", [])).toBe(true);
		expect(isSalesConversion("form-whatsapp", "WHATSAPP", [])).toBe(true);
	});
});
