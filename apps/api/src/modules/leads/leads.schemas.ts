import { z } from "zod";

export const STAGES = ["NEW", "QUALIFICATION", "MEETING", "TRIAL", "CLOSING"] as const;
export const STATUSES = ["OPEN", "WON", "LOST"] as const;
export const TEMPERATURES = ["COLD", "WARM", "HOT"] as const;
export const CHANNELS = ["DEMO", "WHATSAPP", "SITE", "MANUAL"] as const;
export const PARTICIPANT_ROLES = ["SDR", "CLOSER", "ONBOARDING", "TECHNICAL", "OBSERVER"] as const;

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max, `Deve conter no máximo ${max} caracteres`)
		.nullish()
		.transform((v) => (v ? v : null));

export const leadBodySchema = z.object({
	name: z.string({ required_error: "Nome é obrigatório" }).trim().min(1, "Nome é obrigatório").max(120),
	email: z
		.string()
		.trim()
		.email("E-mail inválido")
		.nullish()
		.or(z.literal(""))
		.transform((v) => (v ? v.toLowerCase() : null)),
	phone: optionalText(30),
	jobTitle: optionalText(80),
	companyName: optionalText(120),
	companySize: optionalText(40),
	segment: optionalText(80),
	website: optionalText(200),
	city: optionalText(80),
	state: optionalText(2),
	temperature: z.enum(TEMPERATURES).nullish(),
	estimatedValue: z.coerce.number().min(0, "O valor deve ser positivo").nullish(),
	plan: optionalText(60),
	billingCycle: z.enum(["MONTHLY", "ANNUAL"]).nullish(),
	notes: optionalText(2000),
	channel: z.enum(CHANNELS).optional(),
	businessType: optionalText(120),
	managementRole: optionalText(120),
	contractsRange: optionalText(120),
	currentTool: optionalText(120),
	startTimeline: optionalText(120),
	tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
	source: z.string().trim().max(60).optional(),
	utmSource: optionalText(120),
	utmMedium: optionalText(120),
	utmCampaign: optionalText(120),
	ownerId: z.string().nullish(),
	stage: z.enum(STAGES).optional(),
});

export const leadUpdateSchema = leadBodySchema.partial();

export const leadListQuerySchema = z.object({
	search: z.string().trim().optional(),
	stage: z.enum(STAGES).optional(),
	status: z.enum([...STATUSES, "ALL"]).default("OPEN"),
	ownerId: z.string().optional(),
	mine: z.enum(["true", "false"]).optional(),
	source: z.string().optional(),
	channel: z.enum(CHANNELS).optional(),
	temperature: z.enum(TEMPERATURES).optional(),
	skip: z.coerce.number().int().min(0).default(0),
	take: z.coerce.number().int().min(1).max(1000).default(50),
	orderByColumn: z
		.enum(["createdAt", "name", "companyName", "estimatedValue", "stageChangedAt", "id"])
		.default("createdAt"),
	orderByAsc: z.enum(["true", "false"]).default("false"),
});

export const moveStageSchema = z.object({ stage: z.enum(STAGES) });

export const winSchema = z.object({
	estimatedValue: z.coerce.number().min(0).nullish(),
	plan: optionalText(60),
	billingCycle: z.enum(["MONTHLY", "ANNUAL"]).nullish(),
	note: optionalText(2000),
});

export const loseSchema = z.object({
	reason: z.string({ required_error: "Motivo é obrigatório" }).trim().min(1, "Motivo é obrigatório").max(120),
	note: optionalText(2000),
});

export const participantSchema = z.object({
	userId: z.string({ required_error: "Pessoa é obrigatória" }).min(1, "Pessoa é obrigatória"),
	role: z.enum(PARTICIPANT_ROLES).default("OBSERVER"),
});

export const transferSchema = z.object({ ownerId: z.string().min(1, "Responsável é obrigatório") });
