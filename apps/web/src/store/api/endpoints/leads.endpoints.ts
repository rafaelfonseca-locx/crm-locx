import type { ApiResponse } from "../@types/common.types";
import type { Lead, LeadListParams, LeadPayload, LeadStage, ParticipantRole, StageEvent } from "../@types/lead.types";
import { apiService, cleanParams } from "../apiService";

const leadChanged = (id: number) => [
	{ type: "Lead" as const, id },
	{ type: "Lead" as const, id: "LIST" },
	{ type: "Activity" as const, id: `LEAD-${id}` },
	{ type: "Activity" as const, id: "AGENDA" },
	"Dashboard" as const,
	"Trial" as const,
	"User" as const,
];

export const leadsApi = apiService.injectEndpoints({
	endpoints: (build) => ({
		getLeads: build.query<ApiResponse<Lead[]>, LeadListParams>({
			query: ({ mine, orderByAsc, ...params }) => ({
				url: "/leads",
				params: cleanParams({
					...params,
					mine: mine ? "true" : undefined,
					orderByAsc: orderByAsc === undefined ? undefined : String(orderByAsc),
				}),
			}),
			providesTags: (result) => [
				{ type: "Lead", id: "LIST" },
				...(result?.data ?? []).map((l) => ({ type: "Lead" as const, id: l.id })),
			],
		}),
		getLeadSources: build.query<ApiResponse<{ source: string; count: number }[]>, void>({
			query: () => "/leads/sources",
			providesTags: [{ type: "Lead", id: "LIST" }],
		}),
		getLeadById: build.query<ApiResponse<Lead>, number>({
			query: (id) => `/leads/${id}`,
			providesTags: (_r, _e, id) => [{ type: "Lead", id }],
		}),
		getLeadHistory: build.query<ApiResponse<StageEvent[]>, number>({
			query: (id) => `/leads/${id}/history`,
			providesTags: (_r, _e, id) => [{ type: "Lead", id }],
		}),
		createLead: build.mutation<ApiResponse<Lead>, LeadPayload>({
			query: (body) => ({ url: "/leads", method: "POST", body }),
			invalidatesTags: [{ type: "Lead", id: "LIST" }, "Dashboard", "User", { type: "Activity", id: "AGENDA" }],
		}),
		updateLead: build.mutation<ApiResponse<Lead>, { id: number } & LeadPayload>({
			query: ({ id, ...body }) => ({ url: `/leads/${id}`, method: "PATCH", body }),
			invalidatesTags: (_r, _e, { id }) => leadChanged(id),
		}),
		deleteLead: build.mutation<ApiResponse<{ id: number }>, number>({
			query: (id) => ({ url: `/leads/${id}`, method: "DELETE" }),
			invalidatesTags: [{ type: "Lead", id: "LIST" }, "Dashboard", "Trial", "User", { type: "Activity", id: "AGENDA" }],
		}),
		moveLeadStage: build.mutation<ApiResponse<Lead>, { id: number; stage: LeadStage }>({
			query: ({ id, stage }) => ({ url: `/leads/${id}/stage`, method: "POST", body: { stage } }),
			invalidatesTags: (_r, _e, { id }) => leadChanged(id),
		}),
		winLead: build.mutation<
			ApiResponse<Lead>,
			{ id: number; estimatedValue?: number | null; plan?: string | null; note?: string | null }
		>({
			query: ({ id, ...body }) => ({ url: `/leads/${id}/win`, method: "POST", body }),
			invalidatesTags: (_r, _e, { id }) => leadChanged(id),
		}),
		loseLead: build.mutation<ApiResponse<Lead>, { id: number; reason: string; note?: string | null }>({
			query: ({ id, ...body }) => ({ url: `/leads/${id}/lose`, method: "POST", body }),
			invalidatesTags: (_r, _e, { id }) => leadChanged(id),
		}),
		reopenLead: build.mutation<ApiResponse<Lead>, number>({
			query: (id) => ({ url: `/leads/${id}/reopen`, method: "POST" }),
			invalidatesTags: (_r, _e, id) => leadChanged(id),
		}),
		claimLead: build.mutation<ApiResponse<Lead>, number>({
			query: (id) => ({ url: `/leads/${id}/claim`, method: "POST" }),
			invalidatesTags: (_r, _e, id) => leadChanged(id),
		}),
		transferLead: build.mutation<ApiResponse<Lead>, { id: number; ownerId: string }>({
			query: ({ id, ownerId }) => ({ url: `/leads/${id}/transfer`, method: "POST", body: { ownerId } }),
			invalidatesTags: (_r, _e, { id }) => leadChanged(id),
		}),
		addParticipant: build.mutation<ApiResponse<Lead>, { id: number; userId: string; role: ParticipantRole }>({
			query: ({ id, ...body }) => ({ url: `/leads/${id}/participants`, method: "POST", body }),
			invalidatesTags: (_r, _e, { id }) => leadChanged(id),
		}),
		removeParticipant: build.mutation<ApiResponse<Lead>, { id: number; userId: string }>({
			query: ({ id, userId }) => ({ url: `/leads/${id}/participants/${userId}`, method: "DELETE" }),
			invalidatesTags: (_r, _e, { id }) => leadChanged(id),
		}),
	}),
});
