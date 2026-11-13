import { describe, expect, it } from "vitest";
import { detectChannel, extractQualification, temperatureFromTimeline } from "./qualification.js";

describe("extractQualification", () => {
	it("mapeia as perguntas do formulário de agendamento", () => {
		const q = extractQualification([
			["Estado", "SP"],
			["Qualificação do negócio", "Imobiliária"],
			["Qual seu papel na gestão dos imóveis?", "Sócio ou diretor"],
			["Quantos contratos de aluguel você gerencia hoje?", "51 a 200"],
			["Como você gerencia hoje?", "Planilhas"],
			["Quando você pretende começar a usar um sistema?", "Em até 30 dias"],
		]);
		expect(q).toEqual({
			state: "SP",
			businessType: "Imobiliária",
			managementRole: "Sócio ou diretor",
			contractsRange: "51 a 200",
			currentTool: "Planilhas",
			startTimeline: "Em até 30 dias",
		});
	});

	it("aceita campos personalizados do RD (cf_) e valores do Cal.com ({ value })", () => {
		const q = extractQualification([
			["cf_qual_o_seu_perfil", "Administradora"],
			["cf_quantidade_de_imoveis_que_voce_gerencia_hoje", { value: "Até 50", label: "Quantidade" }],
		]);
		expect(q.businessType).toBe("Administradora");
		expect(q.contractsRange).toBe("Até 50");
	});

	it("ignora valores vazios", () => {
		expect(extractQualification([["Como você gerencia hoje?", ""]]).currentTool).toBeNull();
	});
});

describe("detectChannel", () => {
	it("identifica o canal pelo identificador da conversão", () => {
		expect(detectChannel("agendar-demonstracao")).toBe("DEMO");
		expect(detectChannel("formulario-whatsapp")).toBe("WHATSAPP");
		expect(detectChannel("form-wpp-home")).toBe("WHATSAPP");
		expect(detectChannel("landing-gestao-locacao")).toBe("SITE");
		expect(detectChannel(null)).toBe("SITE");
	});
});

describe("temperatureFromTimeline", () => {
	it("sugere a temperatura pelo prazo para começar", () => {
		expect(temperatureFromTimeline("Imediatamente")).toBe("HOT");
		expect(temperatureFromTimeline("Em até 30 dias")).toBe("HOT");
		expect(temperatureFromTimeline("Em até 3 meses")).toBe("WARM");
		expect(temperatureFromTimeline("Só estou pesquisando")).toBe("COLD");
		expect(temperatureFromTimeline(null)).toBeNull();
	});
});
