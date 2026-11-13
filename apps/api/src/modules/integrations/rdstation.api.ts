import type { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { decrypt, encrypt } from "../../lib/crypto.js";
import { HttpError } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";

/**
 * API do RD Station Marketing com o app da LocX (RD Station App Store).
 * O CRM devolve para o RD a etapa do funil, a venda e a perda de cada lead.
 */

const RD_API = "https://api.rd.services";
const TOKEN_KEY = "rdOAuth";

type StoredTokens = { accessToken: string; refreshToken: string; expiresAt: string; connectedAt: string };
type TokenResponse = { access_token: string; refresh_token: string; expires_in: number };

export const isRdApiConfigured = () => !!(env.RD_CLIENT_ID && env.RD_CLIENT_SECRET);
export const rdRedirectUri = () => `${env.PUBLIC_API_URL}/api/integrations/rd-station/callback`;

export function buildRdAuthUrl(userId: string) {
	if (!isRdApiConfigured()) throw new HttpError(400, "O app do RD Station ainda não foi configurado no servidor");
	const state = jwt.sign({ sub: userId, purpose: "rd" }, env.JWT_SECRET, { expiresIn: "10m" });
	const params = new URLSearchParams({ client_id: env.RD_CLIENT_ID ?? "", redirect_uri: rdRedirectUri(), state });
	return `${RD_API}/auth/dialog?${params}`;
}

export function readRdState(state: string) {
	const payload = jwt.verify(state, env.JWT_SECRET) as jwt.JwtPayload;
	if (payload.purpose !== "rd") throw new Error("Estado inválido");
	return String(payload.sub);
}

async function requestTokens(tokenBy: "code" | "refresh_token", value: string) {
	const res = await fetch(`${RD_API}/auth/token?token_by=${tokenBy}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			client_id: env.RD_CLIENT_ID,
			client_secret: env.RD_CLIENT_SECRET,
			[tokenBy === "code" ? "code" : "refresh_token"]: value,
		}),
	});
	if (!res.ok) throw new Error(`RD recusou o token (${res.status}): ${(await res.text()).slice(0, 200)}`);
	return (await res.json()) as TokenResponse;
}

async function saveTokens(tokens: TokenResponse, connectedAt = new Date().toISOString()) {
	const value: StoredTokens = {
		accessToken: encrypt(tokens.access_token),
		refreshToken: encrypt(tokens.refresh_token),
		expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
		connectedAt,
	};
	await prisma.setting.upsert({ where: { key: TOKEN_KEY }, create: { key: TOKEN_KEY, value }, update: { value } });
}

export async function connectRd(code: string) {
	await saveTokens(await requestTokens("code", code));
}

export async function disconnectRd() {
	await prisma.setting.deleteMany({ where: { key: TOKEN_KEY } });
}

export async function getRdConnection() {
	const setting = await prisma.setting.findUnique({ where: { key: TOKEN_KEY } });
	return setting ? (setting.value as StoredTokens) : null;
}

async function accessToken(force = false) {
	const stored = await getRdConnection();
	if (!stored) return null;
	if (!force && new Date(stored.expiresAt).getTime() > Date.now() + 60_000) return decrypt(stored.accessToken);
	const tokens = await requestTokens("refresh_token", decrypt(stored.refreshToken));
	await saveTokens(tokens, stored.connectedAt);
	return tokens.access_token;
}

async function rdFetch(path: string, init: RequestInit) {
	let token = await accessToken();
	if (!token) return null;
	const call = (t: string) =>
		fetch(`${RD_API}${path}`, {
			...init,
			headers: { ...init.headers, authorization: `Bearer ${t}`, "content-type": "application/json" },
		});
	let res = await call(token);
	if (res.status === 401) {
		token = await accessToken(true);
		if (token) res = await call(token);
	}
	return res;
}

type LeadForRd = {
	id: number;
	email: string | null;
	stage: string;
	status: string;
	kind?: string;
	estimatedValue: Prisma.Decimal | number | null;
	lostReason: string | null;
	owner: { email: string } | null;
};

/** Etapa do CRM → funil do RD. */
export function rdFunnelFor(lead: Pick<LeadForRd, "stage" | "status">) {
	if (lead.status === "WON") return { lifecycle_stage: "Client", opportunity: true };
	if (lead.status === "LOST") return { lifecycle_stage: "Lead", opportunity: false };
	if (lead.stage === "NEW" || lead.stage === "QUALIFICATION") return { lifecycle_stage: "Lead", opportunity: false };
	return { lifecycle_stage: "Qualified Lead", opportunity: true };
}

async function logSync(status: "PROCESSED" | "ERROR", message: string, leadId: number, email: string) {
	await prisma.webhookLog.create({ data: { source: "rd-sync", status, message, leadId, payload: { email } } });
}

export async function syncLeadToRd(leadId: number) {
	if (!isRdApiConfigured() || !(await getRdConnection())) return;
	const lead = (await prisma.lead.findUnique({
		where: { id: leadId },
		select: {
			id: true,
			email: true,
			stage: true,
			status: true,
			kind: true,
			estimatedValue: true,
			lostReason: true,
			owner: { select: { email: true } },
		},
	})) as LeadForRd | null;
	// Parceiro não é venda: não mexe no funil do RD
	if (!lead?.email || lead.kind === "PARTNER") return;
	const identifier = encodeURIComponent(`email:${lead.email}`);
	const funnel = rdFunnelFor(lead);

	let res = await rdFetch(`/platform/contacts/${identifier}/funnels/default`, {
		method: "PUT",
		body: JSON.stringify({ ...funnel, contact_owner_email: lead.owner?.email ?? null }),
	});
	// O responsável precisa ser usuário do RD; se não for, atualiza sem ele
	if (res && res.status >= 400 && res.status < 500 && lead.owner) {
		res = await rdFetch(`/platform/contacts/${identifier}/funnels/default`, {
			method: "PUT",
			body: JSON.stringify(funnel),
		});
	}
	if (!res) return;
	if (!res.ok) {
		await logSync("ERROR", `Funil não atualizado no RD (${res.status})`, lead.id, lead.email);
		return;
	}

	if (lead.status === "WON" || lead.status === "LOST") {
		const event =
			lead.status === "WON"
				? {
						event_type: "SALE",
						event_family: "CDP",
						payload: { email: lead.email, funnel_name: "default", value: Number(lead.estimatedValue ?? 0) },
					}
				: {
						event_type: "OPPORTUNITY_LOST",
						event_family: "CDP",
						payload: { email: lead.email, funnel_name: "default", reason: lead.lostReason ?? "Outro" },
					};
		const eventRes = await rdFetch(`/platform/events?event_type=${event.event_type}`, {
			method: "POST",
			body: JSON.stringify(event),
		});
		if (eventRes && !eventRes.ok) {
			await logSync(
				"ERROR",
				`${lead.status === "WON" ? "Venda" : "Perda"} não registrada no RD (${eventRes.status})`,
				lead.id,
				lead.email,
			);
			return;
		}
	}
	await logSync(
		"PROCESSED",
		`RD atualizado: ${lead.status === "WON" ? "venda" : lead.status === "LOST" ? "perdido" : funnel.lifecycle_stage}`,
		lead.id,
		lead.email,
	);
}

/** Não deixa uma falha no RD atrapalhar a ação no CRM. */
export function syncLeadToRdSafely(leadId: number) {
	syncLeadToRd(leadId).catch((error) =>
		console.error("Falha ao sincronizar com o RD:", error instanceof Error ? error.message : error),
	);
}
