import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ASSIGNMENT_SETTING_KEY, type AssignmentMode, upsertInboundLead } from "./inbound.service.js";
import { extractRdLeads, normalizeRdLead } from "./rdstation.mapper.js";

export { ASSIGNMENT_SETTING_KEY, type AssignmentMode };

const CHANNEL_LABELS = {
	DEMO: "Agendamento de demonstração",
	WHATSAPP: "Formulário do WhatsApp",
	SITE: "Formulário do site",
	MANUAL: "Manual",
};

export async function getAssignmentMode(): Promise<AssignmentMode> {
	const setting = await prisma.setting.findUnique({ where: { key: ASSIGNMENT_SETTING_KEY } });
	const mode = (setting?.value as { mode?: AssignmentMode } | null)?.mode;
	return mode === "UNASSIGNED" ? "UNASSIGNED" : "ROUND_ROBIN";
}

type ProcessResult = { status: "PROCESSED" | "UPDATED" | "IGNORED"; leadId: number | null; message: string };

export const LEAD_CONVERSIONS_KEY = "leadConversions";
/** Formulários de venda do RD da LocX. Os de conteúdo (e-books, planilhas, calculadoras) não criam lead. */
export const DEFAULT_LEAD_CONVERSIONS = [
	"formulario-homepage",
	"formulario-homepage-rodape",
	"formulario-locxre",
	"formulario-locxre-rodape",
];

export async function getLeadConversions(): Promise<string[]> {
	const setting = await prisma.setting.findUnique({ where: { key: LEAD_CONVERSIONS_KEY } });
	const list = (setting?.value as { identifiers?: string[] } | null)?.identifiers;
	return Array.isArray(list) ? list : DEFAULT_LEAD_CONVERSIONS;
}

/** Demonstração e WhatsApp sempre criam lead; o resto só se o formulário estiver na lista. */
export function isSalesConversion(identifier: string | null, channel: string, allowed: string[]) {
	if (channel === "DEMO" || channel === "WHATSAPP" || !identifier) return true;
	return allowed.map((a) => a.trim().toLowerCase()).includes(identifier.trim().toLowerCase());
}

export async function handleRdWebhook(payload: unknown) {
	const rawLeads = extractRdLeads(payload);
	if (rawLeads.length === 0) {
		await prisma.webhookLog.create({
			data: {
				source: "rd-station",
				status: "ERROR",
				message: "Nenhum lead encontrado no payload",
				payload: payload as Prisma.InputJsonValue,
			},
		});
		return [];
	}
	const results: (ProcessResult | { status: "ERROR"; message: string })[] = [];
	const allowed = await getLeadConversions();
	for (const raw of rawLeads) {
		try {
			const lead = normalizeRdLead(raw);
			if (!lead.email && !lead.phone) throw new Error("Lead sem e-mail e sem telefone");
			const conversion = lead.conversionIdentifier ? ` (${lead.conversionIdentifier})` : "";

			if (!isSalesConversion(lead.conversionIdentifier, lead.channel, allowed)) {
				// Conversão de conteúdo: entra no histórico de quem já é lead, mas não cria lead novo
				const existing = await prisma.lead.findFirst({
					where: {
						OR: [
							...(lead.rdLeadId ? [{ rdLeadId: lead.rdLeadId }] : []),
							...(lead.email ? [{ email: lead.email }] : []),
						],
					},
					select: { id: true },
				});
				if (existing) {
					await prisma.activity.create({
						data: { leadId: existing.id, type: "SYSTEM", title: `Conversão de conteúdo no RD Station${conversion}` },
					});
				}
				const ignored: ProcessResult = {
					status: existing ? "UPDATED" : "IGNORED",
					leadId: existing?.id ?? null,
					message: existing ? "Conversão de conteúdo registrada no lead" : "Conversão de conteúdo: não cria lead",
				};
				results.push(ignored);
				await prisma.webhookLog.create({
					data: {
						source: "rd-station",
						status: ignored.status,
						message: ignored.message,
						leadId: ignored.leadId,
						payload: raw as Prisma.InputJsonValue,
					},
				});
				continue;
			}

			const result = await prisma.$transaction((tx) =>
				upsertInboundLead(
					tx,
					{ ...lead, source: "RD Station" },
					{ eventLabel: `Conversão no RD Station: ${CHANNEL_LABELS[lead.channel]}${conversion}` },
				),
			);
			const processed: ProcessResult = {
				status: result.created ? "PROCESSED" : "UPDATED",
				leadId: result.leadId,
				message: result.created
					? `${CHANNEL_LABELS[lead.channel]} · ${result.ownerId ? "lead criado e distribuído" : "lead criado sem responsável"}`
					: result.reactivated
						? "Lead perdido reativado"
						: "Conversão registrada em lead existente",
			};
			results.push(processed);
			await prisma.webhookLog.create({
				data: {
					source: "rd-station",
					status: processed.status,
					message: processed.message,
					leadId: processed.leadId,
					payload: raw as Prisma.InputJsonValue,
				},
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Erro ao processar lead";
			results.push({ status: "ERROR", message });
			await prisma.webhookLog.create({
				data: { source: "rd-station", status: "ERROR", message, payload: raw as Prisma.InputJsonValue },
			});
		}
	}
	return results;
}

const SAMPLES = {
	DEMO: {
		identifier: "agendar-demonstracao",
		custom: {
			"Qualificação do negócio": "Imobiliária",
			"Qual seu papel na gestão dos imóveis?": "Sócio ou diretor",
			"Quantos contratos de aluguel você gerencia hoje?": "201 a 500",
			"Como você gerencia hoje?": "Outro sistema",
			"Quando você pretende começar a usar um sistema?": "Em até 30 dias",
		},
	},
	WHATSAPP: {
		identifier: "formulario-whatsapp",
		custom: { "Qual o seu perfil?": "Administradora", "Quantidade de imóveis que você gerencia hoje?": "51 a 200" },
	},
	SITE: {
		identifier: "formulario-homepage",
		custom: { "Quantos imóveis você gerencia?": "Até 50", "Como você gerencia hoje?": "Planilhas" },
	},
} as const;

export function buildSampleRdPayload(channel: keyof typeof SAMPLES = "SITE") {
	const id = Math.random().toString(36).slice(2, 8);
	const sample = SAMPLES[channel];
	return {
		leads: [
			{
				id: `teste-${id}`,
				email: `lead.teste.${id}@exemplo.com.br`,
				name: `Lead de teste (${CHANNEL_LABELS[channel]})`,
				company: "Empresa Exemplo Ltda",
				mobile_phone: "(11) 99999-0000",
				state: "SP",
				tags: ["teste"],
				number_conversions: "1",
				custom_fields: sample.custom,
				last_conversion: {
					content: { identificador: sample.identifier },
					conversion_origin: { source: "google", medium: "cpc", campaign: "teste-crm" },
				},
			},
		],
	};
}
