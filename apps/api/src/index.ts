import { createApp } from "./app.js";
import { env } from "./config/env.js";

createApp().listen(env.PORT, () => {
	console.info(`API do CRM LocX rodando em http://localhost:${env.PORT}`);
});
