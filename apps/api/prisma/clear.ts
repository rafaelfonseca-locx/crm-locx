import { PrismaClient } from "@prisma/client";

/** Apaga leads, atividades, trials e logs de integração. O time e as configurações são mantidos. */
const prisma = new PrismaClient();

async function main() {
	const count = await prisma.lead.count();
	await prisma.$transaction([
		prisma.webhookLog.deleteMany(),
		prisma.trialChecklistItem.deleteMany(),
		prisma.trial.deleteMany(),
		prisma.activity.deleteMany(),
		prisma.stageEvent.deleteMany(),
		prisma.leadParticipant.deleteMany(),
		prisma.lead.deleteMany(),
	]);
	await prisma.user.updateMany({ data: { lastAssignedAt: null } });
	await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Lead_id_seq" RESTART WITH 1`);
	console.info(`${count} leads apagados. O time foi mantido. O CRM está pronto para receber leads reais.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
