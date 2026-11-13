import { prisma } from "../../lib/prisma.js";
import { notify } from "../notifications/notifications.service.js";
import { fetchMeetTranscript, hasGoogle } from "./google.service.js";
import { summarizeTranscript } from "./summary.js";

const MINUTE = 60 * 1000;

/** Busca a transcrição de uma reunião do Meet e gera o resumo. Devolve o status da busca. */
export async function syncMeetingTranscript(activityId: string) {
	const meeting = await prisma.activity.findUnique({
		where: { id: activityId },
		include: { lead: { select: { id: true, name: true, companyName: true, ownerId: true } } },
	});
	if (!meeting?.meetingCode) return { status: "no-meeting-code" as const };
	const userId = (await hasGoogle(meeting.assigneeId))
		? meeting.assigneeId
		: (await hasGoogle(meeting.lead.ownerId))
			? meeting.lead.ownerId
			: null;
	if (!userId) return { status: "no-google" as const };

	const result = await fetchMeetTranscript(userId, meeting.meetingCode);
	await prisma.activity.update({ where: { id: meeting.id }, data: { transcriptCheckedAt: new Date() } });
	if (result.status !== "ready") return { status: result.status };

	const aiSummary = await summarizeTranscript(result.text, {
		leadName: meeting.lead.name,
		companyName: meeting.lead.companyName,
	});
	await prisma.activity.update({
		where: { id: meeting.id },
		data: {
			transcript: result.text,
			aiSummary: aiSummary ?? meeting.aiSummary,
			completedAt: meeting.completedAt ?? new Date(),
		},
	});
	await notify([meeting.assigneeId, meeting.lead.ownerId], {
		type: "TRANSCRIPT",
		title: `Transcrição pronta: ${meeting.lead.companyName ?? meeting.lead.name}`,
		body: aiSummary
			? "O resumo da reunião já está na linha do tempo do lead."
			: "A transcrição da reunião já está no lead.",
		leadId: meeting.lead.id,
		dedupeKey: `transcript:${meeting.id}`,
	});
	return { status: "ready" as const };
}

/** Tarefa periódica: reuniões do Meet que acabaram nos últimos 3 dias e ainda não têm transcrição. */
export async function syncPendingTranscripts(now = new Date()) {
	const meetings = await prisma.activity.findMany({
		where: {
			type: "MEETING",
			meetingCode: { not: null },
			transcript: null,
			dueAt: { gte: new Date(now.getTime() - 3 * 24 * 60 * MINUTE), lte: new Date(now.getTime() - 20 * MINUTE) },
			OR: [{ transcriptCheckedAt: null }, { transcriptCheckedAt: { lt: new Date(now.getTime() - 15 * MINUTE) } }],
		},
		select: { id: true },
		take: 20,
	});
	for (const meeting of meetings) {
		try {
			await syncMeetingTranscript(meeting.id);
		} catch (error) {
			console.error("Falha ao buscar transcrição:", error instanceof Error ? error.message : error);
		}
	}
}
