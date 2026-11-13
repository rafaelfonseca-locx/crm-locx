import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";

export class HttpError extends Error {
	constructor(
		public status: number,
		message: string,
		public details?: unknown,
	) {
		super(message);
	}
}

export const notFound = (entity: string) => new HttpError(404, `${entity} não encontrado(a)`);

/** Resposta padrão da API: `{ success, data, count? }` */
export function ok<T>(res: Response, data: T, count?: number, status = 200) {
	return res.status(status).json({ success: true, data, ...(count !== undefined ? { count } : {}) });
}

export function parse<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
	const result = schema.safeParse(value);
	if (!result.success) {
		const first = result.error.issues[0];
		throw new HttpError(400, first?.message ?? "Dados inválidos", result.error.flatten().fieldErrors);
	}
	return result.data;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
	if (err instanceof HttpError) {
		return res.status(err.status).json({ success: false, message: err.message, details: err.details });
	}
	if (typeof err === "object" && err && "code" in err && err.code === "P2025") {
		return res.status(404).json({ success: false, message: "Registro não encontrado" });
	}
	if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
		return res.status(409).json({ success: false, message: "Já existe um registro com esses dados" });
	}
	console.error(err);
	return res.status(500).json({ success: false, message: "Erro interno do servidor" });
}
