import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

// Chave derivada do segredo da API: tokens de terceiros ficam ilegíveis no banco
const key = createHash("sha256").update(`${env.JWT_SECRET}:tokens`).digest();

export function encrypt(text: string) {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
	return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string) {
	const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
	const decipher = createDecipheriv("aes-256-gcm", key, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
