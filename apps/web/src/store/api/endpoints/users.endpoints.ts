import type { ApiResponse } from "../@types/common.types";
import type { TeamMember, UserPayload } from "../@types/user.types";
import { apiService } from "../apiService";

export const usersApi = apiService.injectEndpoints({
	endpoints: (build) => ({
		// biome-ignore lint/suspicious/noConfusingVoidType: void permite chamar o hook sem argumentos
		getUsers: build.query<ApiResponse<TeamMember[]>, { includeInactive?: boolean } | void>({
			query: (params) => ({ url: "/users", params: params?.includeInactive ? { includeInactive: "true" } : undefined }),
			providesTags: [{ type: "User", id: "LIST" }],
		}),
		createUser: build.mutation<ApiResponse<TeamMember>, UserPayload>({
			query: (body) => ({ url: "/users", method: "POST", body }),
			invalidatesTags: [{ type: "User", id: "LIST" }],
		}),
		updateUser: build.mutation<ApiResponse<TeamMember>, { id: string } & UserPayload>({
			query: ({ id, ...body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
			invalidatesTags: [{ type: "User", id: "LIST" }, "Me"],
		}),
	}),
});
