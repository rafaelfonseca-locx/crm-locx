import type { ApiResponse } from "../@types/common.types";
import { apiService } from "../apiService";

export type GoogleStatus = { configured: boolean; connected: boolean; email: string | null; aiSummaries: boolean };

export const googleApi = apiService.injectEndpoints({
	endpoints: (build) => ({
		getGoogleStatus: build.query<ApiResponse<GoogleStatus>, void>({
			query: () => "/integrations/google/status",
			providesTags: ["Me"],
		}),
		getGoogleConnectUrl: build.mutation<ApiResponse<{ url: string }>, void>({
			query: () => ({ url: "/integrations/google/connect", method: "POST" }),
		}),
		syncTranscript: build.mutation<ApiResponse<{ message: string }>, { activityId: string; leadId: number }>({
			query: ({ activityId }) => ({ url: `/integrations/google/transcripts/${activityId}`, method: "POST" }),
			invalidatesTags: (_r, _e, { leadId }) => [
				{ type: "Activity", id: `LEAD-${leadId}` },
				{ type: "Lead", id: leadId },
			],
		}),
		disconnectGoogle: build.mutation<ApiResponse<{ ok: boolean }>, void>({
			query: () => ({ url: "/integrations/google", method: "DELETE" }),
			invalidatesTags: ["Me"],
		}),
	}),
});
