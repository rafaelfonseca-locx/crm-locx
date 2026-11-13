/**
 * Perguntas padronizadas dos formulários (RD Station e Cal.com) → campos de qualificação do lead.
 * O casamento é feito pelo nome/rótulo do campo, então funciona com qualquer nomenclatura
 * que contenha as palavras-chave (ex.: "cf_quantos_contratos", "Quantos imóveis você gerencia?").
 */

export type LeadChannelValue = "DEMO" | "WHATSAPP" | "SITE" | "MANUAL";
export type TemperatureValue = "COLD" | "WARM" | "HOT";

export type Qualification = {
	businessType: string | null;
	managementRole: string | null;
	contractsRange: string | null;
	currentTool: string | null;
	startTimeline: string | null;
	state: string | null;
};

const normalize = (value: string) =>
	value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();

// A ordem importa: "Qual seu papel na gestão dos imóveis?" contém "imóveis" (papel vem antes da quantidade)
// e "Quantos contratos você gerencia hoje?" contém "gerencia hoje" (quantidade vem antes de "como gerencia").
const RULES: { field: keyof Qualification; pattern: RegExp }[] = [
	{ field: "managementRole", pattern: /papel|cargo|funcao|atuacao/ },
	{ field: "contractsRange", pattern: /contrato|imove|quantidade|quantos|portfolio|carteira/ },
	{ field: "startTimeline", pattern: /quando|pretende|prazo|comecar|iniciar/ },
	{ field: "currentTool", pattern: /como .*geren|gerencia hoje|ferramenta|sistema atual|controla/ },
	{ field: "businessType", pattern: /qualificacao|perfil|negocio|tipo de empresa|segmento|voce e/ },
	{ field: "state", pattern: /^(estado|uf)$|estado|^uf/ },
];

function toText(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ") || null;
	if (typeof value === "object") {
		const obj = value as Record<string, unknown>;
		return toText(obj.value ?? obj.label ?? null);
	}
	const text = String(value).trim();
	return text && text.toLowerCase() !== "null" ? text : null;
}

/** Recebe pares [nome do campo, valor] e devolve os campos de qualificação encontrados. */
export function extractQualification(entries: [string, unknown][]): Qualification {
	const result: Qualification = {
		businessType: null,
		managementRole: null,
		contractsRange: null,
		currentTool: null,
		startTimeline: null,
		state: null,
	};
	for (const [key, raw] of entries) {
		const value = toText(raw);
		if (!value) continue;
		const name = normalize(key).replace(/^cf_/, "").replace(/_/g, " ");
		const rule = RULES.find((r) => r.pattern.test(name));
		if (rule && !result[rule.field]) result[rule.field] = value.slice(0, 120);
	}
	return result;
}

/** Canal de entrada a partir do identificador da conversão no RD. */
export function detectChannel(conversionIdentifier: string | null | undefined): LeadChannelValue {
	const id = normalize(conversionIdentifier ?? "");
	if (/agend|demo|cal\.?com|reuniao/.test(id)) return "DEMO";
	if (/whats|wpp|zap/.test(id)) return "WHATSAPP";
	return "SITE";
}

/** Temperatura sugerida pela pergunta "Quando você pretende começar a usar um sistema?". */
export function temperatureFromTimeline(timeline: string | null | undefined): TemperatureValue | null {
	if (!timeline) return null;
	const t = normalize(timeline);
	if (/imediat|agora|urgente|ja |30 dias|1 mes|este mes|proximo mes/.test(t)) return "HOT";
	if (/3 meses|90 dias|2 meses|60 dias|trimestre/.test(t)) return "WARM";
	if (/pesquis|sem previsao|nao sei|6 meses|ano/.test(t)) return "COLD";
	return null;
}
