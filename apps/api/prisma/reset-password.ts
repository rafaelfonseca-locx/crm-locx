import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Volta a senha de uma pessoa para a senha inicial (ela troca no próximo acesso).
 * Uso: npm run db:reset-password -- nome@locx.com.br
 * Sem e-mail, lista quem existe no banco.
 */
const INITIAL_PASSWORD = "locx@2026";
const prisma = new PrismaClient();

async function listUsers() {
	const users = await prisma.user.findMany({ select: { email: true, active: true }, orderBy: { name: "asc" } });
	if (users.length === 0) {
		console.info("Nenhum usuário no banco. Rode: npm run db:seed");
		return;
	}
	console.info("Usuários cadastrados:");
	for (const u of users) console.info(`  ${u.email}${u.active ? "" : " (inativo)"}`);
}

async function main() {
	const email = process.argv[2]?.trim().toLowerCase();
	if (!email) {
		await listUsers();
		console.info("\nPara redefinir: npm run db:reset-password -- nome@locx.com.br");
		return;
	}
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) {
		console.error(`Não encontrei ${email}.\n`);
		await listUsers();
		process.exitCode = 1;
		return;
	}
	await prisma.user.update({
		where: { id: user.id },
		data: { passwordHash: await bcrypt.hash(INITIAL_PASSWORD, 10), mustChangePassword: true, active: true },
	});
	console.info(`Senha de ${email} redefinida para ${INITIAL_PASSWORD}. Troque no próximo acesso.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
