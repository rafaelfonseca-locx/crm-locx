import {
	type BaseQueryFn,
	type FetchArgs,
	type FetchBaseQueryError,
	createApi,
	fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { logout } from "../authSlice";

type AuthState = { auth: { token: string | null } };

const rawBaseQuery = fetchBaseQuery({
	baseUrl: `${import.meta.env.VITE_API_URL ?? ""}/api`,
	prepareHeaders: (headers, { getState }) => {
		const token = (getState() as AuthState).auth.token;
		if (token) headers.set("authorization", `Bearer ${token}`);
		return headers;
	},
});

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
	const result = await rawBaseQuery(args, api, extra);
	if (result.error?.status === 401) api.dispatch(logout());
	return result;
};

export const TAGS = ["Lead", "Activity", "User", "Me", "Dashboard", "Trial", "Integration"] as const;

export const apiService = createApi({
	reducerPath: "api",
	baseQuery,
	tagTypes: TAGS,
	endpoints: () => ({}),
});

/** Converte o erro da API em mensagem legível (em português). */
export function getApiErrorMessage(error: unknown, fallback = "Não foi possível concluir a ação. Tente novamente") {
	if (typeof error === "object" && error && "data" in error) {
		const data = (error as { data?: { message?: string } }).data;
		if (data?.message) return data.message;
	}
	if (
		typeof error === "object" &&
		error &&
		"status" in error &&
		(error as { status: unknown }).status === "FETCH_ERROR"
	) {
		return "Sem conexão com o servidor";
	}
	return fallback;
}

/** Remove parâmetros vazios antes de enviar a query string. */
export function cleanParams<T extends Record<string, unknown>>(params: T) {
	return Object.fromEntries(
		Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
	) as Partial<T>;
}
