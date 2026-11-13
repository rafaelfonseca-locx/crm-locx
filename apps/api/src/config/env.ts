import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().default(3333),
	DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
	JWT_SECRET: z.string().min(8, "JWT_SECRET deve ter pelo menos 8 caracteres"),
	WEB_ORIGIN: z.string().default("http://localhost:5173"),
	RD_WEBHOOK_TOKEN: z.string().min(8, "RD_WEBHOOK_TOKEN deve ter pelo menos 8 caracteres"),
	PUBLIC_API_URL: z.string().default("http://localhost:3333"),
	CAL_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
	process.exit(1);
}

export const env = parsed.data;
