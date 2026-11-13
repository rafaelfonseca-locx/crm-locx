/**
 * Normaliza o payload do webhook do RD Station Marketing.
 *
 * O webhook de conversão envia `{ "leads": [ { id, email, name, company, job_title, personal_phone,
 * mobile_phone, city, state, website, tags, public_url, number_conversions, custom_fields,
 * first_conversion: { content: { identificador }, conversion_origin: { source, medium, campaign } },
 * last_conversion: { … } } ] }`.
 * Como o formato pode variar (versões da API, automações intermediárias como n8n/Zapier),
 * o mapeamento aceita também um lead único ou campos "achatados" (`utm_source`, `conversion_identifier`…).
 */

export type RdNormalizedLead = {
	rdLeadId: string | null;
	name: string;
	email: string | null;
	phone: string | null;
	jobTitle: string | null;
	companyName: string | null;
	companySize: string | null;
	segment: string | null;
	website: string | null;
	city: string | null;
	state: string | null;
	conversionIdentifier: string | null;
	conversionCount: number;
	utmSource: string | null;
	utmMedium: string | null;
	utmCampaign: string | null;
	tags: string[];
	rdPublicUrl: string | null;
};

type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict => typeof v === "object" && v !== null && !Array.isArray(v);

function str(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "null") return value.trim();
		if (typeof value === "number") return String(value);
	}
	return null;
}

function pick(obj: unknown, path: string): unknown {
	return path.split(".").reduce<unknown>((acc, key) => (isDict(acc) ? acc[key] : undefined), obj);
}

const UF_BY_NAME: Record<string, string> = {
	acre: "AC",
	alagoas: "AL",
	amapa: "AP",
	amazonas: "AM",
	bahia: "BA",
	ceara: "CE",
	"distrito federal": "DF",
	"espirito santo": "ES",
	goias: "GO",
	maranhao: "MA",
	"mato grosso": "MT",
	"mato grosso do sul": "MS",
	"minas gerais": "MG",
	para: "PA",
	paraiba: "PB",
	parana: "PR",
	pernambuco: "PE",
	piaui: "PI",
	"rio de janeiro": "RJ",
	"rio grande do norte": "RN",
	"rio grande do sul": "RS",
	rondonia: "RO",
	roraima: "RR",
	"santa catarina": "SC",
	"sao paulo": "SP",
	sergipe: "SE",
	tocantins: "TO",
};

/** Converte "SP", "sp" ou "São Paulo" para a sigla da UF. */
export function toUf(value: string | null): string | null {
	if (!value) return null;
	if (/^[a-z]{2}$/i.test(value)) return value.toUpperCase();
	const key = value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
	return UF_BY_NAME[key] ?? null;
}

function findCustomField(customFields: unknown, pattern: RegExp): string | null {
	if (!isDict(customFields)) return null;
	for (const [key, value] of Object.entries(customFields)) {
		if (pattern.test(key)) return str(Array.isArray(value) ? value.join(", ") : value);
	}
	return null;
}

export function extractRdLeads(payload: unknown): Dict[] {
	if (Array.isArray(payload)) return payload.filter(isDict);
	if (!isDict(payload)) return [];
	if (Array.isArray(payload.leads)) return payload.leads.filter(isDict);
	if (isDict(payload.lead)) return [payload.lead];
	if (isDict(payload.contact)) return [payload.contact];
	if (payload.email || payload.name) return [payload];
	return [];
}

export function normalizeRdLead(raw: Dict): RdNormalizedLead {
	const conversion = isDict(raw.last_conversion)
		? raw.last_conversion
		: isDict(raw.first_conversion)
			? raw.first_conversion
			: {};
	const firstConversion = isDict(raw.first_conversion) ? raw.first_conversion : conversion;
	const origin = pick(firstConversion, "conversion_origin") ?? pick(conversion, "conversion_origin");
	const customFields = raw.custom_fields;
	const email = str(raw.email);
	const tags = Array.isArray(raw.tags) ? raw.tags.map((t) => str(t)).filter((t): t is string => !!t) : [];
	const conversionCount = Number(raw.number_conversions ?? raw.conversion_count ?? 1);

	return {
		rdLeadId: str(raw.uuid, raw.id),
		name:
			str(raw.name, pick(conversion, "content.nome"), pick(conversion, "content.name"), email?.split("@")[0]) ??
			"Lead sem nome",
		email: email ? email.toLowerCase() : null,
		phone: str(raw.mobile_phone, raw.personal_phone, raw.phone, pick(conversion, "content.telefone")),
		jobTitle: str(raw.job_title, pick(conversion, "content.cargo")),
		companyName: str(raw.company, raw.company_name, pick(conversion, "content.empresa")),
		companySize: str(raw.company_size, findCustomField(customFields, /tamanho|porte|funcion|employees|size/i)),
		segment: str(raw.segment, findCustomField(customFields, /segment|setor|ramo|nicho|industry/i)),
		website: str(raw.website, raw.company_site),
		city: str(raw.city),
		state: toUf(str(raw.state, raw.uf)),
		conversionIdentifier: str(
			pick(conversion, "content.identificador"),
			pick(conversion, "content.conversion_identifier"),
			raw.conversion_identifier,
			pick(conversion, "source"),
		),
		conversionCount: Number.isFinite(conversionCount) && conversionCount > 0 ? conversionCount : 1,
		utmSource: str(pick(origin, "source"), raw.utm_source, raw.traffic_source),
		utmMedium: str(pick(origin, "medium"), raw.utm_medium, raw.traffic_medium),
		utmCampaign: str(pick(origin, "campaign"), raw.utm_campaign, raw.traffic_campaign),
		tags,
		rdPublicUrl: str(raw.public_url),
	};
}
