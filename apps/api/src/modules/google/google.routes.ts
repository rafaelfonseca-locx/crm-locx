import { Router } from "express";
import { env } from "../../config/env.js";
import { HttpError, notFound, ok } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/auth.js";
import {
	buildGoogleAuthUrl,
	connectGoogleAccount,
	disconnectGoogleAccount,
	isGoogleConfigured,
	readGoogleState,
} from "./google.service.js";
import { isAiSummaryEnabled } from "./summary.js";
import { syncMeetingTranscript } from "./transcripts.js";

export const googlePublicRouter = Router();
export const googleRouter = Router();

const webUrl = (path: string) => `${env.WEB_ORIGIN.split(",")[0].trim()}${path}`;

// Volta do consentimento do Google (sem login: o "state" assinado identifica o usuário)
googlePublicRouter.get("/callback", async (req, res) => {
	try {
		if (req.query.error) throw new Error(String(req.query.error));
		const userId = readGoogleState(String(req.query.state ?? ""));
		await connectGoogleAccount(userId, String(req.query.code ?? ""));
		return res.redirect(webUrl("/?google=conectado"));
	} catch (error) {
		console.error("Falha ao conectar o Google:", error instanceof Error ? error.message : error);
		return res.redirect(webUrl("/?google=erro"));
	}
});

googleRouter.use(requireAuth);

googleRouter.get("/status", async (req, res) => {
	const account = await prisma.googleAccount.findUnique({ where: { userId: req.user.id }, select: { email: true } });
	return ok(res, {
		configured: isGoogleConfigured(),
		connected: !!account,
		email: account?.email ?? null,
		aiSummaries: isAiSummaryEnabled(),
	});
});

googleRouter.post("/connect", async (req, res) => ok(res, { url: buildGoogleAuthUrl(req.user.id) }));

googleRouter.delete("/", async (req, res) => {
	await disconnectGoogleAccount(req.user.id);
	return ok(res, { ok: true });
});

googleRouter.post("/transcripts/:activityId", async (req, res) => {
	const exists = await prisma.activity.findUnique({ where: { id: req.params.activityId }, select: { id: true } });
	if (!exists) throw notFound("Reunião");
	const result = await syncMeetingTranscript(req.params.activityId);
	const messages: Record<string, string> = {
		ready: "Transcrição importada",
		pending: "A transcrição ainda não está pronta no Google. Tente de novo em alguns minutos",
		none: "Essa reunião não foi transcrita no Meet",
		"no-google": "Quem conduziu a reunião precisa conectar o Google em Preferências",
		"no-meeting-code": "Essa reunião não tem link do Google Meet",
	};
	if (result.status !== "ready") throw new HttpError(409, messages[result.status]);
	return ok(res, { message: messages.ready });
});
