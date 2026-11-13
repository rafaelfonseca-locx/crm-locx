import type { ApiResponse } from "../@types/common.types";
import type { AppNotification } from "../@types/user.types";
import { apiService } from "../apiService";

export const notificationsApi = apiService.injectEndpoints({
	endpoints: (build) => ({
		getNotifications: build.query<ApiResponse<{ items: AppNotification[]; unread: number }>, void>({
			query: () => "/notifications",
			providesTags: ["Notification"],
		}),
		markNotificationsRead: build.mutation<ApiResponse<{ ok: boolean }>, { ids?: string[] }>({
			query: (body) => ({ url: "/notifications/read", method: "POST", body }),
			invalidatesTags: ["Notification"],
		}),
	}),
});
