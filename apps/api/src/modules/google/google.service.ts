import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { decrypt, encrypt } from "../../lib/crypto.js";
import { HttpError } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Google por usuário (OAuth): cria reuniões no Google Agenda com link do Meet
 * e busca a transcrição pela Google Meet REST API.
 */

const SCOPES = [
	"openid",
	"email",
	"https://www.googleapis.com/auth/calendar.events",
	"https://www.googleapis.com/auth/meetings.space.readonly",
];

export const isGoogleConfigured = () => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const googleRedirectUri = () => `${env.PUBLIC_API_URL}/api/integrations/google/callback`;

export function buildGoogleAuthUrl(userId: string) {
	if (!isGoogleConfigured()) throw new HttpError(400, "O Google ainda não foi configurado no servidor");
	const state = jwt.sign({ sub: userId, purpose: "google" }, env.JWT_SECRET, { expiresIn: "10m" });
	const params = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID ?? "",
		redirect_uri: googleRedirectUri(),
		response_type: "code",
		scope: SCOPES.join(" "),
		access_type: "offline",
		prompt: "consent",
		include_granted_scopes: "true",
		state,
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function readGoogleState(state: string) {
	const payload = jwt.verify(state, env.JWT_SECRET) as jwt.JwtPayload;
	if (payload.purpose !== "google") throw new Error("Estado inválido");
	return String(payload.sub);
}

type TokenResponse = {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	scope: string;
	id_token?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
	const res = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID ?? "",
			client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
			...body,
		}),
	});
	if (!res.ok) throw new Error(`Google recusou o token (${res.status}): ${await res.text()}`);
	return (await res.json()) as TokenResponse;
}

function emailFromIdToken(idToken?: string) {
	if (!idToken) return null;
	const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as { email?: string };
	return payload.email ?? null;
}

export async function connectGoogleAccount(userId: string, code: string) {
	const tokens = await tokenRequest({ code, redirect_uri: googleRedirectUri(), grant_type: "authorization_code" });
	if (!tokens.refresh_token)
		throw new Error("O Google não devolveu o refresh token. Remova o acesso do app na conta Google e conecte de novo.");
	const email = emailFromIdToken(tokens.id_token) ?? "conta Google";
	const data = {
		email,
		accessToken: encrypt(tokens.access_token),
		refreshToken: encrypt(tokens.refresh_token),
		expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
		scope: tokens.scope,
	};
	await prisma.googleAccount.upsert({ where: { userId }, create: { userId, ...data }, update: data });
	return email;
}

export async function disconnectGoogleAccount(userId: string) {
	const account = await prisma.googleAccount.findUnique({ where: { userId } });
	if (!account) return;
	await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(account.refreshToken))}`, {
		method: "POST",
	}).catch(() => null);
	await prisma.googleAccount.delete({ where: { userId } });
}

async function getAccessToken(userId: string, forceRefresh = false) {
	const account = await prisma.googleAccount.findUnique({ where: { userId } });
	if (!account) return null;
	if (!forceRefresh && account.expiresAt.getTime() > Date.now() + 60_000) return decrypt(account.accessToken);
	const tokens = await tokenRequest({ refresh_token: decrypt(account.refreshToken), grant_type: "refresh_token" });
	await prisma.googleAccount.update({
		where: { userId },
		data: { accessToken: encrypt(tokens.access_token), expiresAt: new Date(Date.now() + tokens.expires_in * 1000) },
	});
	return tokens.access_token;
}

export async function hasGoogle(userId: string | null | undefined) {
	if (!userId || !isGoogleConfigured()) return false;
	return !!(await prisma.googleAccount.findUnique({ where: { userId }, select: { id: true } }));
}

async function googleFetch<T>(userId: string, url: string, init: RequestInit = {}): Promise<T | null> {
	let token = await getAccessToken(userId);
	if (!token) throw new Error("Conta Google não conectada");
	const call = (t: string) =>
		fetch(url, {
			...init,
			headers: { ...init.headers, authorization: `Bearer ${t}`, "content-type": "application/json" },
		});
	let res = await call(token);
	if (res.status === 401) {
		token = await getAccessToken(userId, true);
		if (token) res = await call(token);
	}
	if (res.status === 204 || res.status === 410) return null;
	if (!res.ok) throw new Error(`Google respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
	return (await res.json()) as T;
}

/** "https://meet.google.com/abc-defg-hij" → "abc-defg-hij" */
export function parseMeetCode(url: string | null | undefined) {
	return url?.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)?.[1]?.toLowerCase() ?? null;
}

type CalendarEvent = {
	id: string;
	hangoutLink?: string;
	htmlLink?: string;
	conferenceData?: { conferenceId?: string };
};
type EventInput = {
	summary: string;
	description?: string;
	start: Date;
	durationMin: number;
	attendeeEmail?: string | null;
};

const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export async function createCalendarEvent(userId: string, input: EventInput) {
	const event = await googleFetch<CalendarEvent>(userId, `${CALENDAR}?conferenceDataVersion=1&sendUpdates=all`, {
		method: "POST",
		body: JSON.stringify({
			summary: input.summary,
			description: input.description,
			start: { dateTime: input.start.toISOString() },
			end: { dateTime: new Date(input.start.getTime() + input.durationMin * 60_000).toISOString() },
			attendees: input.attendeeEmail ? [{ email: input.attendeeEmail }] : [],
			conferenceData: {
				createRequest: {
					requestId: `crm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
					conferenceSolutionKey: { type: "hangoutsMeet" },
				},
			},
		}),
	});
	if (!event) throw new Error("O Google não criou o evento");
	return {
		eventId: event.id,
		meetingUrl: event.hangoutLink ?? null,
		meetingCode: event.conferenceData?.conferenceId ?? parseMeetCode(event.hangoutLink),
	};
}

export async function updateCalendarEvent(userId: string, eventId: string, input: Partial<EventInput>) {
	const body: Record<string, unknown> = {};
	if (input.summary) body.summary = input.summary;
	if (input.start) {
		body.start = { dateTime: input.start.toISOString() };
		body.end = { dateTime: new Date(input.start.getTime() + (input.durationMin ?? 30) * 60_000).toISOString() };
	}
	await googleFetch(userId, `${CALENDAR}/${encodeURIComponent(eventId)}?sendUpdates=all`, {
		method: "PATCH",
		body: JSON.stringify(body),
	});
}

export async function deleteCalendarEvent(userId: string, eventId: string) {
	await googleFetch(userId, `${CALENDAR}/${encodeURIComponent(eventId)}?sendUpdates=all`, { method: "DELETE" });
}

const MEET = "https://meet.googleapis.com/v2";
type ConferenceRecord = { name: string; startTime: string; endTime?: string };
type Transcript = { name: string; state: "STARTED" | "ENDED" | "FILE_GENERATED" };
type Participant = {
	name: string;
	signedinUser?: { displayName?: string };
	anonymousUser?: { displayName?: string };
	phoneUser?: { displayName?: string };
};
type Entry = { participant: string; text: string; startTime: string };

export type TranscriptResult = { status: "ready"; text: string } | { status: "pending" } | { status: "none" };

/** Busca a transcrição da última conferência daquele código de reunião. */
export async function fetchMeetTranscript(userId: string, meetingCode: string): Promise<TranscriptResult> {
	const records = await googleFetch<{ conferenceRecords?: ConferenceRecord[] }>(
		userId,
		`${MEET}/conferenceRecords?filter=${encodeURIComponent(`space.meeting_code="${meetingCode}"`)}`,
	);
	const record = (records?.conferenceRecords ?? [])
		.filter((r) => r.endTime)
		.sort((a, b) => b.startTime.localeCompare(a.startTime))[0];
	if (!record) return { status: "pending" };

	const transcripts = await googleFetch<{ transcripts?: Transcript[] }>(userId, `${MEET}/${record.name}/transcripts`);
	const list = transcripts?.transcripts ?? [];
	if (list.length === 0) return { status: "none" };
	const ready = list.find((t) => t.state === "FILE_GENERATED") ?? list.find((t) => t.state === "ENDED");
	if (!ready) return { status: "pending" };

	const participants = await googleFetch<{ participants?: Participant[] }>(
		userId,
		`${MEET}/${record.name}/participants?pageSize=100`,
	);
	const names = new Map(
		(participants?.participants ?? []).map((p) => [
			p.name,
			p.signedinUser?.displayName ?? p.anonymousUser?.displayName ?? p.phoneUser?.displayName ?? "Participante",
		]),
	);

	const lines: string[] = [];
	let pageToken: string | undefined;
	do {
		const page = await googleFetch<{ transcriptEntries?: Entry[]; nextPageToken?: string }>(
			userId,
			`${MEET}/${ready.name}/entries?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ""}`,
		);
		for (const entry of page?.transcriptEntries ?? [])
			lines.push(`${names.get(entry.participant) ?? "Participante"}: ${entry.text}`);
		pageToken = page?.nextPageToken;
	} while (pageToken);

	return lines.length ? { status: "ready", text: lines.join("\n") } : { status: "pending" };
}
