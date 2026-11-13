import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, ok } from "./lib/http.js";
import { requireAuth } from "./middlewares/auth.js";
import { activitiesRouter } from "./modules/activities/activities.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { googlePublicRouter, googleRouter } from "./modules/google/google.routes.js";
import { integrationsRouter, rdWebhookRouter } from "./modules/integrations/integrations.routes.js";
import { leadsRouter } from "./modules/leads/leads.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { trialsRouter } from "./modules/trials/trials.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export function createApp() {
	const app = express();
	app.disable("x-powered-by");
	app.use(helmet());
	app.use(cors({ origin: env.WEB_ORIGIN.split(",").map((o) => o.trim()) }));
	app.use(
		express.json({
			limit: "1mb",
			// Corpo original, usado para validar a assinatura do webhook do Cal.com
			verify: (req, _res, buf) => {
				(req as express.Request).rawBody = buf;
			},
		}),
	);
	app.use(express.urlencoded({ extended: true }));
	if (env.NODE_ENV !== "test") app.use(morgan("dev"));

	app.get("/api/health", (_req, res) => ok(res, { status: "ok" }));
	app.use("/api/auth", authRouter);
	app.use("/api/integrations/google", googlePublicRouter);
	app.use("/api/integrations/google", googleRouter);
	app.use("/api/integrations", rdWebhookRouter);
	app.use("/api/integrations", integrationsRouter);

	const protectedApi = express.Router();
	protectedApi.use(requireAuth);
	protectedApi.use("/leads", leadsRouter);
	protectedApi.use("/users", usersRouter);
	protectedApi.use("/dashboard", dashboardRouter);
	protectedApi.use("/notifications", notificationsRouter);
	protectedApi.use(activitiesRouter);
	protectedApi.use(trialsRouter);
	app.use("/api", protectedApi);

	app.use("/api", (_req, res) => res.status(404).json({ success: false, message: "Rota não encontrada" }));
	app.use(errorHandler);
	return app;
}
