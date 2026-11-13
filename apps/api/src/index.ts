import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { syncPendingTranscripts } from "./modules/google/transcripts.js";
import { registerJob, startScheduler } from "./modules/notifications/scheduler.js";

registerJob({ name: "transcrições do Meet", everyMs: 10 * 60 * 1000, run: () => syncPendingTranscripts() });

createApp().listen(env.PORT, () => {
	startScheduler();
	console.info(`API do CRM LocX rodando em http://localhost:${env.PORT}`);
});
