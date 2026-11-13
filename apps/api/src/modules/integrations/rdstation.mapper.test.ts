import { describe, expect, it } from "vitest";
import { extractRdLeads, normalizeRdLead, toUf } from "./rdstation.mapper.js";

describe("extractRdLeads", () => {
	it("extrai a lista do formato padrão do webhook", () => {
		expect(extractRdLeads({ leads: [{ email: "a@b.com" }, { email: "c@d.com" }] })).toHaveLength(2);
	});

	it("aceita um lead único e campos achatados", () => {
		expect(extractRdLeads({ email: "a@b.com", name: "A" })).toHaveLength(1);
		expect(extractRdLeads({ lead: { email: "a@b.com" } })).toHaveLength(1);
	});

	it("devolve vazio para payload sem lead", () => {
		expect(extractRdLeads({ foo: "bar" })).toEqual([]);
		expect(extractRdLeads(null)).toEqual([]);
	});
});

describe("toUf", () => {
	it("converte nome do estado e sigla para UF", () => {
		expect(toUf("São Paulo")).toBe("SP");
		expect(toUf("rio grande do sul")).toBe("RS");
		expect(toUf("mg")).toBe("MG");
		expect(toUf("Desconhecido")).toBeNull();
	});
});

describe("normalizeRdLead", () => {
	it("mapeia contato, empresa, conversão e UTMs", () => {
		const lead = normalizeRdLead({
			id: "123",
			email: "Maria@Imob.com.br",
			name: "Maria",
			company: "Imob",
			job_title: "Diretora",
			personal_phone: "1133334444",
			mobile_phone: "11999998888",
			state: "São Paulo",
			number_conversions: "3",
			tags: ["quente", null],
			custom_fields: { "Quantidade de funcionários": "11-50", Segmento: "Locação" },
			first_conversion: { conversion_origin: { source: "google", medium: "cpc", campaign: "lp" } },
			last_conversion: { content: { identificador: "teste-gratis" } },
		});
		expect(lead).toMatchObject({
			rdLeadId: "123",
			email: "maria@imob.com.br",
			phone: "11999998888",
			companyName: "Imob",
			jobTitle: "Diretora",
			state: "SP",
			conversionIdentifier: "teste-gratis",
			conversionCount: 3,
			utmSource: "google",
			utmMedium: "cpc",
			utmCampaign: "lp",
			companySize: "11-50",
			segment: "Locação",
			tags: ["quente"],
		});
	});

	it("usa o e-mail como nome quando o nome não vem", () => {
		expect(normalizeRdLead({ email: "joao@x.com" }).name).toBe("joao");
	});

	it("aceita UTMs achatadas", () => {
		const lead = normalizeRdLead({ email: "a@b.com", utm_source: "facebook", conversion_identifier: "ebook" });
		expect(lead.utmSource).toBe("facebook");
		expect(lead.conversionIdentifier).toBe("ebook");
	});
});
