import type { Activity, ActivityPayload, AgendaParams } from "../@types/activity.types";
import type { ApiResponse } from "../@types/common.types";
import { apiService, cleanParams } from "../apiService";

export const activitiesApi = apiService.injectEndpoints({
	endpoints: (build) => ({
		getLeadActivities: build.query<ApiResponse<Activity[]>, number>({
			query: (leadId) => `/leads/${leadId}/activities`,
			providesTags: (_r, _e, leadId) => [{ type: "Activity", id: `LEAD-${leadId}` }],
		}),
		getAgenda: build.query<ApiResponse<Activity[]>, AgendaParams>({
			query: (params) => ({ url: "/activities", params: cleanParams(params) }),
			providesTags: [{ type: "Activity", id: "AGENDA" }],
		}),
		createActivity: build.mutation<ApiResponse<Activity>, { leadId: number } & ActivityPayload>({
			query: ({ leadId, ...body }) => ({ url: `/leads/${leadId}/activities`, method: "POST", body }),
			invalidatesTags: (_r, _e, { leadId }) => [
				{ type: "Activity", id: `LEAD-${leadId}` },
				{ type: "Activity", id: "AGENDA" },
				{ type: "Lead", id: leadId },
				{ type: "Lead", id: "LIST" },
				"Dashboard",
			],
		}),
		updateActivity: build.mutation<ApiResponse<Activity>, { id: string; leadId: number } & Partial<ActivityPayload>>({
			query: ({ id, leadId: _leadId, ...body }) => ({ url: `/activities/${id}`, method: "PATCH", body }),
			invalidatesTags: (_r, _e, { leadId }) => [
				{ type: "Activity", id: `LEAD-${leadId}` },
				{ type: "Activity", id: "AGENDA" },
				{ type: "Lead", id: leadId },
				{ type: "Lead", id: "LIST" },
				"Dashboard",
			],
		}),
		deleteActivity: build.mutation<ApiResponse<{ id: string }>, { id: string; leadId: number }>({
			query: ({ id }) => ({ url: `/activities/${id}`, method: "DELETE" }),
			invalidatesTags: (_r, _e, { leadId }) => [
				{ type: "Activity", id: `LEAD-${leadId}` },
				{ type: "Activity", id: "AGENDA" },
				{ type: "Lead", id: leadId },
				{ type: "Lead", id: "LIST" },
			],
		}),
	}),
});
