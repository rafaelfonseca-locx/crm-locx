import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";

let transporter: Transporter | null = null;
let warned = false;

export const isEmailConfigured = () => !!env.SMTP_HOST;

function getTransporter() {
	if (!env.SMTP_HOST) return null;
	transporter ??= nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		secure: env.SMTP_SECURE === "true",
		auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
	});
	return transporter;
}

const escapeHtml = (text: string) =>
	text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** E-mail simples com a cara do CRM: título, parágrafos, itens e um botão. */
export function renderEmail(options: {
	title: string;
	paragraphs?: string[];
	items?: { label: string; detail?: string; href?: string }[];
	cta?: { label: string; href: string };
}) {
	const items = options.items?.length
		? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:8px 0 16px">${options.items
				.map(
					(item) =>
						`<tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px">${
							item.href
								? `<a href="${item.href}" style="color:#111;font-weight:600;text-decoration:none">${escapeHtml(item.label)}</a>`
								: `<b>${escapeHtml(item.label)}</b>`
						}${item.detail ? `<div style="color:#666;font-size:12px;margin-top:2px">${escapeHtml(item.detail)}</div>` : ""}</td></tr>`,
				)
				.join("")}</table>`
		: "";
	return `<!doctype html><html><body style="margin:0;background:#f6f6f7;font-family:Inter,Arial,sans-serif;color:#111">
<table role="presentation" width="100%" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;padding:28px">
<tr><td><div style="font-weight:800;font-size:18px;margin-bottom:20px">loc<span style="color:#F2B705">X</span> <span style="font-size:11px;color:#999;letter-spacing:2px">CRM</span></div>
<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(options.title)}</h1>
${(options.paragraphs ?? []).map((p) => `<p style="font-size:14px;line-height:1.55;color:#333;margin:0 0 12px">${escapeHtml(p)}</p>`).join("")}
${items}
${options.cta ? `<a href="${options.cta.href}" style="display:inline-block;background:#FFCC00;color:#111;font-weight:700;font-size:14px;padding:10px 18px;border-radius:8px;text-decoration:none">${escapeHtml(options.cta.label)}</a>` : ""}
<p style="font-size:11px;color:#999;margin-top:28px">Você pode escolher quais e-mails recebe no menu do seu usuário, no CRM.</p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string) {
	const transport = getTransporter();
	if (!transport) {
		if (!warned) console.info("E-mail não configurado (SMTP_HOST vazio): avisos ficam só no sistema.");
		warned = true;
		return false;
	}
	try {
		await transport.sendMail({ from: env.SMTP_FROM, to, subject, html });
		return true;
	} catch (error) {
		console.error("Falha ao enviar e-mail:", error instanceof Error ? error.message : error);
		return false;
	}
}
