import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { parseMeetCode } from "../google/google.service.js";
import { moveStage } from "../leads/leads.service.js";
import { notifySafely } from "../notifications/notifications.service.js";
import { upsertInboundLead } from "./inbound.service.js";
import { extractQualification } from "./qualification.js";
import { toUf } from "./rdstation.mapper.js";

/**
 * Webhook do Cal.com: BOOKING_CREATED, BOOKING_RESCHEDULED e BOOKING_CANCELLED.
 * Formato: { triggerEvent, payload: { uid, rescheduleUid?, title, startTime, endTime, organizer: { email },
 *   attendees: [{ name, email }], responses: { slug: { label, value } }, metadata: { videoCallUrl }, location } }
 */

type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function responseValue(value: unknown): unknown {
	return isDict(value) && "value" in value ? value.value : value;
}

function parseBooking(body: unknown) {
	const root = isDict(body) ? body : {};
	const p = isDict(root.payload) ? root.payload : root;
	const attendee = Array.isArray(p.attendees) && isDict(p.attendees[0]) ? p.attendees[0] : {};
	const organizer = isDict(p.organizer) ? p.organizer : {};
	const responses = isDict(p.responses) ? p.responses : isDict(p.userFieldsResponses) ? p.userFieldsResponses : {};
	const responseEntries: [string, unknown][] = Object.entries(responses).map(([key, value]) => [
		isDict(value) && str(value.label) ? String(value.label) : key,
		responseValue(value),
	]);
	const findResponse = (pattern: RegExp) => {
		const entry = Object.entries(responses).find(
			([key, value]) => pattern.test(key) || (isDict(value) && pattern.test(String(value.label ?? ""))),
		);
		return entry ? str(responseValue(entry[1])) : null;
	};
	const metadata = isDict(p.metadata) ? p.metadata : {};
	const location = str(p.location);

	return {
		trigger: str(root.triggerEvent) ?? "BOOKING_CREATED",
		uid: str(p.uid),
		previousUid:
			str(p.rescheduleUid) ?? str(isDict(p.originalRescheduledBooking) ? p.originalRescheduledBooking.uid : null),
		title: str(p.title) ?? "Demonstração",
		startTime: str(p.startTime),
		endTime: str(p.endTime),
		meetingUrl: str(metadata.videoCallUrl) ?? (location?.startsWith("http") ? location : null),
		organizerEmail: str(organizer.email)?.toLowerCase() ?? null,
		name: str(attendee.name) ?? findResponse(/^name$|nome/i) ?? "Lead sem nome",
		email: (str(attendee.email) ?? findResponse(/email/i))?.toLowerCase() ?? null,
		phone: findResponse(/phone|telefone|whats|celular/i) ?? str(attendee.phoneNumber),
		companyName: findResponse(/empresa|company|imobiliaria/i),
		cancellationReason: str(p.cancellationReason),
		qualification: extractQualification(responseEntries),
	};
}

export type CalResult = { status: "PROCESSED" | "UPDATED" | "IGNORED" | "ERROR"; leadId?: number; message: string };

const formatDate = (iso: string) =>
	new Date(iso).toLocaleString("pt-BR", {
		timeZone: "America/Sao_Paulo",
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});

export async function handleCalWebhook(body: unknown): Promise<CalResult> {
	const booking = parseBooking(body);
	if (booking.trigger === "PING") return { status: "IGNORED", message: "Teste de conexão do Cal.com recebido" };
	if (!booking.email) throw new Error("Agendamento sem e-mail do participante");
	if (!booking.startTime) throw new Error("Agendamento sem data de início");
	const startTime = booking.startTime;

	const organizer = booking.organizerEmail
		? await prisma.user.findFirst({ where: { email: booking.organizerEmail, active: true }, select: { id: true } })
		: null;

	if (booking.trigger === "BOOKING_CANCELLED") {
		const meeting = await prisma.activity.findFirst({
			where: {
				OR: [
					{ externalId: booking.uid ?? "-" },
					{ type: "MEETING", completedAt: null, lead: { email: booking.email } },
				],
			},
			orderBy: { createdAt: "desc" },
			include: { lead: { select: { id: true, ownerId: true } } },
		});
		if (!meeting) return { status: "IGNORED", message: "Cancelamento de reunião que não está no CRM" };
		await prisma.$transaction([
			prisma.activity.update({
				where: { id: meeting.id },
				data: {
					completedAt: new Date(),
					title: `Cancelada: ${meeting.title ?? "Reunião"}`,
					metadata: { cancelled: true, reason: booking.cancellationReason },
				},
			}),
			prisma.activity.create({
				data: {
					leadId: meeting.leadId,
					type: "SYSTEM",
					title: `Reunião cancelada pelo lead no Cal.com${booking.cancellationReason ? `: ${booking.cancellationReason}` : ""}`,
				},
			}),
			prisma.activity.create({
				data: {
					leadId: meeting.leadId,
					type: "TASK",
					title: "Reagendar a demonstração cancelada",
					dueAt: new Date(Date.now() + 60 * 60 * 1000),
					assigneeId: meeting.assigneeId ?? meeting.lead.ownerId,
				},
			}),
		]);
		notifySafely([meeting.assigneeId ?? meeting.lead.ownerId], {
			type: "CALENDAR",
			title: `Demonstração cancelada: ${booking.name}`,
			body: booking.cancellationReason
				? `Motivo: ${booking.cancellationReason}`
				: "O lead cancelou pelo Cal.com. Criamos a tarefa de reagendar.",
			leadId: meeting.leadId,
		});
		return { status: "UPDATED", leadId: meeting.leadId, message: "Reunião cancelada" };
	}

	if (booking.trigger === "BOOKING_RESCHEDULED") {
		const meeting = await prisma.activity.findFirst({
			where: {
				OR: [
					{ externalId: { in: [booking.previousUid, booking.uid].filter((v): v is string => !!v) } },
					{ type: "MEETING", completedAt: null, lead: { email: booking.email } },
				],
			},
			orderBy: { createdAt: "desc" },
		});
		if (meeting) {
			await prisma.$transaction([
				prisma.activity.update({
					where: { id: meeting.id },
					data: {
						dueAt: new Date(startTime),
						meetingUrl: booking.meetingUrl ?? meeting.meetingUrl,
						meetingCode: parseMeetCode(booking.meetingUrl) ?? meeting.meetingCode,
						externalId: booking.uid ?? meeting.externalId,
					},
				}),
				prisma.activity.create({
					data: {
						leadId: meeting.leadId,
						type: "SYSTEM",
						title: `Reunião remarcada no Cal.com para ${formatDate(startTime)}`,
					},
				}),
			]);
			notifySafely([meeting.assigneeId], {
				type: "CALENDAR",
				title: `Demonstração remarcada: ${booking.name}`,
				body: `Nova data: ${formatDate(startTime)}.`,
				leadId: meeting.leadId,
			});
			return { status: "UPDATED", leadId: meeting.leadId, message: `Reunião remarcada para ${formatDate(startTime)}` };
		}
		// Sem a reunião original no CRM: trata como um agendamento novo
	}

	const result = await prisma.$transaction((tx) =>
		upsertInboundLead(
			tx,
			{
				name: booking.name,
				email: booking.email,
				phone: booking.phone,
				companyName: booking.companyName,
				...booking.qualification,
				state: toUf(booking.qualification.state),
				channel: "DEMO",
				source: "Cal.com",
				conversionIdentifier: "agendamento-cal-com",
			},
			{
				eventLabel: `Demonstração agendada no Cal.com para ${formatDate(startTime)}`,
				preferredOwnerId: organizer?.id ?? null,
				skipFirstContactTask: true,
			},
		),
	);

	const lead = await prisma.lead.findUniqueOrThrow({
		where: { id: result.leadId },
		select: { id: true, companyName: true, name: true, stage: true, status: true, ownerId: true },
	});
	const assigneeId = organizer?.id ?? lead.ownerId;
	await prisma.activity.upsert({
		where: { externalId: booking.uid ?? `cal-${lead.id}-${startTime}` },
		create: {
			leadId: lead.id,
			type: "MEETING",
			title: `Demonstração · ${lead.companyName ?? lead.name}`,
			dueAt: new Date(startTime),
			meetingUrl: booking.meetingUrl,
			externalId: booking.uid ?? `cal-${lead.id}-${startTime}`,
			meetingCode: parseMeetCode(booking.meetingUrl),
			durationMin: booking.endTime
				? Math.round((new Date(booking.endTime).getTime() - new Date(startTime).getTime()) / 60000)
				: 45,
			assigneeId,
			metadata: { source: "cal.com", endTime: booking.endTime },
		},
		update: {
			dueAt: new Date(startTime),
			meetingUrl: booking.meetingUrl,
			meetingCode: parseMeetCode(booking.meetingUrl),
		},
	});
	// Lead sem dono recebe quem vai conduzir a reunião
	if (!lead.ownerId && assigneeId) await prisma.lead.update({ where: { id: lead.id }, data: { ownerId: assigneeId } });
	if (lead.status === "OPEN" && (lead.stage === "NEW" || lead.stage === "QUALIFICATION")) {
		await moveStage(lead.id, "MEETING", assigneeId ?? null);
	}
	notifySafely([assigneeId], {
		type: "CALENDAR",
		title: `Demonstração agendada: ${lead.companyName ?? lead.name}`,
		body: `${formatDate(startTime)}${booking.meetingUrl ? ` · ${booking.meetingUrl}` : ""}`,
		leadId: lead.id,
	});
	return {
		status: result.created ? "PROCESSED" : "UPDATED",
		leadId: lead.id,
		message: `Demonstração em ${formatDate(startTime)}${result.created ? " · lead criado" : " · lead existente"}`,
	};
}

export async function logCalWebhook(body: unknown, result: CalResult) {
	const email =
		isDict(body) && isDict(body.payload) && Array.isArray(body.payload.attendees) && isDict(body.payload.attendees[0])
			? body.payload.attendees[0].email
			: null;
	await prisma.webhookLog.create({
		data: {
			source: "cal.com",
			status: result.status === "IGNORED" ? "UPDATED" : result.status,
			message: result.message,
			leadId: result.leadId ?? null,
			payload: { email, ...(isDict(body) ? body : {}) } as Prisma.InputJsonValue,
		},
	});
}

export function buildSampleCalPayload(organizerEmail: string | null) {
	const id = Math.random().toString(36).slice(2, 8);
	const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
	start.setUTCHours(14, 0, 0, 0);
	return {
		triggerEvent: "BOOKING_CREATED",
		payload: {
			uid: `teste-${id}`,
			title: "Demonstração LocX",
			startTime: start.toISOString(),
			endTime: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
			organizer: { name: "Vendedor", email: organizerEmail ?? "" },
			attendees: [{ name: "Lead de teste (Cal.com)", email: `cal.teste.${id}@exemplo.com.br` }],
			metadata: { videoCallUrl: "https://meet.google.com/abc-defg-hij" },
			responses: {
				name: { label: "Nome completo", value: "Lead de teste (Cal.com)" },
				email: { label: "E-mail corporativo", value: `cal.teste.${id}@exemplo.com.br` },
				whatsapp: { label: "WhatsApp", value: "(11) 98888-0000" },
				estado: { label: "Estado", value: "MG" },
				perfil: { label: "Qualificação do negócio", value: "Family office" },
				papel: { label: "Qual seu papel na gestão dos imóveis?", value: "Gestor do patrimônio" },
				contratos: { label: "Quantos contratos de aluguel você gerencia hoje?", value: "51 a 100" },
				gestao: { label: "Como você gerencia hoje?", value: "Não, uso planilha" },
				inicio: { label: "Quando você pretende começar a usar um sistema?", value: "Imediatamente" },
			},
		},
	};
}
