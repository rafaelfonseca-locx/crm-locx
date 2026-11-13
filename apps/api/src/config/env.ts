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
	// E-mail (SMTP): Google Workspace, Resend, servidor da empresa...
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.coerce.number().default(587),
	SMTP_SECURE: z.enum(["true", "false"]).default("false"),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),
	SMTP_FROM: z.string().default("LocX CRM <crm@locx.com.br>"),
	// Google (Agenda, Meet e transcrições)
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),
	// IA para resumir transcrições (opcional)
	ANTHROPIC_API_KEY: z.string().optional(),
	// RD Station (app do RD Station App Store)
	RD_CLIENT_ID: z.string().optional(),
	RD_CLIENT_SECRET: z.string().optional(),
	// Fuso usado nos e-mails e no resumo diário
	APP_TIMEZONE: z.string().default("America/Sao_Paulo"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
	process.exit(1);
}

export const env = parsed.data;
