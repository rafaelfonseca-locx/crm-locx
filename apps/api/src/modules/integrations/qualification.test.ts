import { describe, expect, it } from "vitest";
import { detectChannel, extractQualification, normalizePlan, temperatureFromTimeline } from "./qualification.js";

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
			planInterest: null,
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

	it("reconhece as conversões de holding da LocX", () => {
		expect(detectChannel("botao-wpp-holding")).toBe("WHATSAPP");
		expect(detectChannel("agendou_demonstracao")).toBe("DEMO");
		expect(detectChannel("formulario-lp-re_patrimonial")).toBe("SITE");
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

describe("campos reais do RD Station da LocX", () => {
	it("usa os identificadores conhecidos, com prioridade sobre palavras-chave", () => {
		const q = extractQualification([
			["cf_cargo_decisao", "Decisor"],
			["cf_papel_gestao", "Sócio ou diretor"],
			["cf_como_gerencia", "Planilhas"],
			["cf_ja_usa_sistema_de_gestao", "Sim, outro sistema"],
			["cf_qtd_contratos", "51 a 200"],
			["cf_intencao", "Em até 30 dias"],
			["cf_estado_uf", "SP"],
			["cf_plano_interesse", "Pro"],
			["cf_qual_melhor_descreve_sua_estrutura_hoje", "Holding patrimonial familiar"],
		]);
		expect(q).toEqual({
			managementRole: "Sócio ou diretor",
			currentTool: "Planilhas",
			contractsRange: "51 a 200",
			startTimeline: "Em até 30 dias",
			state: "SP",
			planInterest: "Pro",
			businessType: "Holding patrimonial familiar",
		});
	});
});

describe("normalizePlan", () => {
	it("reconhece o plano pelo nome", () => {
		expect(normalizePlan("Plano Pro anual")).toBe("Pro");
		expect(normalizePlan("PREMIUM")).toBe("Premium");
		expect(normalizePlan("basic")).toBe("Basic");
		expect(normalizePlan("Enterprise (sob consulta)")).toBe("Enterprise");
		expect(normalizePlan("Profissional")).toBeNull();
		expect(normalizePlan(null)).toBeNull();
	});
});
