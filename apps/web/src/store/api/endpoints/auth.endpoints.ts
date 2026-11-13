import type { ApiResponse } from "../@types/common.types";
import type { CurrentUser } from "../@types/user.types";
import { apiService } from "../apiService";

export const authApi = apiService.injectEndpoints({
	endpoints: (build) => ({
		login: build.mutation<ApiResponse<{ token: string; user: CurrentUser }>, { email: string; password: string }>({
			query: (body) => ({ url: "/auth/login", method: "POST", body }),
		}),
		getMe: build.query<ApiResponse<CurrentUser>, void>({
			query: () => "/auth/me",
			providesTags: ["Me"],
		}),
		updateMe: build.mutation<
			ApiResponse<CurrentUser>,
			{ name?: string; color?: string; currentPassword?: string; newPassword?: string }
		>({
			query: (body) => ({ url: "/auth/me", method: "PATCH", body }),
			invalidatesTags: ["Me", "User"],
		}),
	}),
});
