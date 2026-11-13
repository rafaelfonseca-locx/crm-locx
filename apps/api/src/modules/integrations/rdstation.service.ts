import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { type RdNormalizedLead, extractRdLeads, normalizeRdLead } from "./rdstation.mapper.js";

export type AssignmentMode = "ROUND_ROBIN" | "UNASSIGNED";
export const ASSIGNMENT_SETTING_KEY = "leadAssignment";
const FIRST_CONTACT_SLA_MINUTES = 60;

export async function getAssignmentMode(): Promise<AssignmentMode> {
	const setting = await prisma.setting.findUnique({ where: { key: ASSIGNMENT_SETTING_KEY } });
	const mode = (setting?.value as { mode?: AssignmentMode } | null)?.mode;
	return mode === "UNASSIGNED" ? "UNASSIGNED" : "ROUND_ROBIN";
}

/** Rodízio: quem recebeu lead há mais tempo recebe o próximo. */
export async function pickNextOwner(tx: Prisma.TransactionClient): Promise<string | null> {
	const setting = await tx.setting.findUnique({ where: { key: ASSIGNMENT_SETTING_KEY } });
	if ((setting?.value as { mode?: string } | null)?.mode === "UNASSIGNED") return null;
	const next = await tx.user.findFirst({
		where: { active: true, receivesLeads: true },
		orderBy: [{ lastAssignedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
	});
	if (!next) return null;
	await tx.user.update({ where: { id: next.id }, data: { lastAssignedAt: new Date() } });
	return next.id;
}

type ProcessResult = { status: "PROCESSED" | "UPDATED"; leadId: number; message: string };

export async function processRdLead(data: RdNormalizedLead): Promise<ProcessResult> {
	return prisma.$transaction(async (tx) => {
		const existing = await tx.lead.findFirst({
			where: {
				OR: [...(data.rdLeadId ? [{ rdLeadId: data.rdLeadId }] : []), ...(data.email ? [{ email: data.email }] : [])],
			},
			orderBy: { createdAt: "desc" },
		});

		const conversionLabel = data.conversionIdentifier ? `: ${data.conversionIdentifier}` : "";

		if (existing) {
			const reactivate = existing.status === "LOST";
			await tx.lead.update({
				where: { id: existing.id },
				data: {
					conversionCount: { increment: 1 },
					rdLeadId: existing.rdLeadId ?? data.rdLeadId,
					rdPublicUrl: data.rdPublicUrl ?? existing.rdPublicUrl,
					phone: existing.phone ?? data.phone,
					companyName: existing.companyName ?? data.companyName,
					jobTitle: existing.jobTitle ?? data.jobTitle,
					...(reactivate
						? { status: "OPEN", stage: "NEW", lostAt: null, lostReason: null, stageChangedAt: new Date() }
						: {}),
				},
			});
			if (reactivate) {
				await tx.stageEvent.create({
					data: {
						leadId: existing.id,
						fromStage: existing.stage,
						toStage: "NEW",
						fromStatus: "LOST",
						toStatus: "OPEN",
					},
				});
			}
			await tx.activity.create({
				data: {
					leadId: existing.id,
					type: "SYSTEM",
					title: reactivate
						? `Lead reativado por nova conversão no RD Station${conversionLabel}`
						: `Nova conversão no RD Station${conversionLabel}`,
					metadata: { utmSource: data.utmSource, utmMedium: data.utmMedium, utmCampaign: data.utmCampaign },
				},
			});
			return {
				status: "UPDATED",
				leadId: existing.id,
				message: reactivate ? "Lead perdido reativado" : "Conversão registrada em lead existente",
			};
		}

		const ownerId = await pickNextOwner(tx);
		const lead = await tx.lead.create({
			data: {
				name: data.name,
				email: data.email,
				phone: data.phone,
				jobTitle: data.jobTitle,
				companyName: data.companyName,
				companySize: data.companySize,
				segment: data.segment,
				website: data.website,
				city: data.city,
				state: data.state,
				source: "RD Station",
				utmSource: data.utmSource,
				utmMedium: data.utmMedium,
				utmCampaign: data.utmCampaign,
				conversionIdentifier: data.conversionIdentifier,
				conversionCount: data.conversionCount,
				rdLeadId: data.rdLeadId,
				rdPublicUrl: data.rdPublicUrl,
				tags: data.tags,
				ownerId,
			},
		});
		await tx.stageEvent.create({ data: { leadId: lead.id, toStage: "NEW", toStatus: "OPEN" } });
		await tx.activity.create({
			data: { leadId: lead.id, type: "SYSTEM", title: `Lead recebido do RD Station${conversionLabel}` },
		});
		if (ownerId) {
			await tx.activity.create({
				data: {
					leadId: lead.id,
					type: "TASK",
					title: "Fazer o primeiro contato",
					body: "Lead novo do RD Station. Quanto mais rápido o contato, maior a chance de conversão.",
					dueAt: new Date(Date.now() + FIRST_CONTACT_SLA_MINUTES * 60 * 1000),
					assigneeId: ownerId,
				},
			});
		}
		return {
			status: "PROCESSED",
			leadId: lead.id,
			message: ownerId ? "Lead criado e distribuído" : "Lead criado sem responsável",
		};
	});
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
	for (const raw of rawLeads) {
		try {
			const normalized = normalizeRdLead(raw);
			if (!normalized.email && !normalized.phone) throw new Error("Lead sem e-mail e sem telefone");
			const result = await processRdLead(normalized);
			results.push(result);
			await prisma.webhookLog.create({
				data: {
					source: "rd-station",
					status: result.status,
					message: result.message,
					leadId: result.leadId,
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

export function buildSampleRdPayload() {
	const id = Math.random().toString(36).slice(2, 8);
	return {
		leads: [
			{
				id: `teste-${id}`,
				email: `lead.teste.${id}@exemplo.com.br`,
				name: "Lead de teste",
				company: "Empresa Exemplo Ltda",
				job_title: "Gerente de operações",
				mobile_phone: "(11) 99999-0000",
				city: "São Paulo",
				state: "SP",
				tags: ["teste"],
				number_conversions: "1",
				custom_fields: { "Tamanho da empresa": "11-50 funcionários" },
				last_conversion: {
					content: { identificador: "teste-integracao-crm" },
					conversion_origin: { source: "google", medium: "cpc", campaign: "teste-crm" },
				},
			},
		],
	};
}
