import { env } from "../../config/env.js";
import { renderEmail, sendEmail } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";

export type NotificationType =
	| "LEAD_ASSIGNED"
	| "PARTICIPANT_ADDED"
	| "TASK_ASSIGNED"
	| "MEETING_SOON"
	| "TASK_OVERDUE"
	| "TRIAL_ENDING"
	| "CALENDAR"
	| "TRANSCRIPT";

/** Qual preferência de e-mail controla cada tipo (os demais ficam só no sistema). */
const EMAIL_PREFERENCE: Partial<Record<NotificationType, "emailOnAssigned" | "emailOnCalendar">> = {
	LEAD_ASSIGNED: "emailOnAssigned",
	PARTICIPANT_ADDED: "emailOnAssigned",
	CALENDAR: "emailOnCalendar",
};

type NotifyInput = {
	type: NotificationType;
	title: string;
	body?: string | null;
	leadId?: number | null;
	/** Mesma chave para o mesmo usuário não gera aviso repetido */
	dedupeKey?: string;
	/** Quem causou o evento não é avisado */
	actorId?: string | null;
};

export const leadUrl = (leadId: number) => `${env.WEB_ORIGIN.split(",")[0].trim()}/leads/${leadId}`;

export async function notify(userIds: (string | null | undefined)[], input: NotifyInput) {
	const recipients = [...new Set(userIds.filter((id): id is string => !!id && id !== input.actorId))];
	if (recipients.length === 0) return;
	const users = await prisma.user.findMany({
		where: { id: { in: recipients }, active: true },
		select: { id: true, email: true, emailOnAssigned: true, emailOnCalendar: true },
	});
	for (const user of users) {
		const dedupeKey = input.dedupeKey ? `${input.dedupeKey}:${user.id}` : null;
		if (dedupeKey && (await prisma.notification.findUnique({ where: { dedupeKey }, select: { id: true } }))) continue;
		const notification = await prisma.notification.create({
			data: {
				userId: user.id,
				type: input.type,
				title: input.title,
				body: input.body ?? null,
				leadId: input.leadId ?? null,
				link: input.leadId ? `/leads/${input.leadId}` : null,
				dedupeKey,
			},
		});
		const preference = EMAIL_PREFERENCE[input.type];
		if (preference && user[preference]) {
			const sent = await sendEmail(
				user.email,
				input.title,
				renderEmail({
					title: input.title,
					paragraphs: input.body ? [input.body] : [],
					cta: input.leadId ? { label: "Abrir no CRM", href: leadUrl(input.leadId) } : undefined,
				}),
			);
			if (sent) await prisma.notification.update({ where: { id: notification.id }, data: { emailedAt: new Date() } });
		}
	}
}

/** Não deixa um aviso derrubar a ação principal. */
export function notifySafely(userIds: (string | null | undefined)[], input: NotifyInput) {
	notify(userIds, input).catch((error) => console.error("Falha ao criar notificação:", error));
}
