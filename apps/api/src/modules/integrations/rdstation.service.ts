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

type ProcessResult = { status: "PROCESSED" | "UPDATED"; leadId: number; message: string };

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
	for (const raw of rawLeads) {
		try {
			const lead = normalizeRdLead(raw);
			if (!lead.email && !lead.phone) throw new Error("Lead sem e-mail e sem telefone");
			const conversion = lead.conversionIdentifier ? ` (${lead.conversionIdentifier})` : "";
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
		identifier: "formulario-site",
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
