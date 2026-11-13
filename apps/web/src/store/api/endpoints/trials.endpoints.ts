import type { ApiResponse } from "../@types/common.types";
import type { Lead, Trial, TrialChecklistItem, TrialStatus } from "../@types/lead.types";
import { apiService } from "../apiService";

const trialChanged = (leadId: number) => [
	"Trial" as const,
	{ type: "Lead" as const, id: leadId },
	{ type: "Lead" as const, id: "LIST" },
	{ type: "Activity" as const, id: `LEAD-${leadId}` },
	"Dashboard" as const,
];

export const trialsApi = apiService.injectEndpoints({
	endpoints: (build) => ({
		getTrials: build.query<ApiResponse<Lead[]>, { status: "ACTIVE" | "ENDED" | "ALL"; mine?: boolean }>({
			query: ({ status, mine }) => ({ url: "/trials", params: { status, ...(mine ? { mine: "true" } : {}) } }),
			providesTags: ["Trial"],
		}),
		startTrial: build.mutation<
			ApiResponse<Lead>,
			{ leadId: number; startDate: string; durationDays: number; accountUrl?: string | null; notes?: string | null }
		>({
			query: ({ leadId, ...body }) => ({ url: `/leads/${leadId}/trial`, method: "POST", body }),
			invalidatesTags: (_r, _e, { leadId }) => [...trialChanged(leadId), { type: "Activity", id: "AGENDA" }, "User"],
		}),
		updateTrial: build.mutation<
			ApiResponse<Trial>,
			{
				id: string;
				leadId: number;
				endDate?: string;
				status?: Exclude<TrialStatus, "CONVERTED">;
				accountUrl?: string | null;
				notes?: string | null;
			}
		>({
			query: ({ id, leadId: _leadId, ...body }) => ({ url: `/trials/${id}`, method: "PATCH", body }),
			invalidatesTags: (_r, _e, { leadId }) => trialChanged(leadId),
		}),
		toggleChecklistItem: build.mutation<
			ApiResponse<TrialChecklistItem>,
			{ trialId: string; itemId: string; leadId: number; done: boolean }
		>({
			query: ({ trialId, itemId, done }) => ({
				url: `/trials/${trialId}/checklist/${itemId}`,
				method: "PATCH",
				body: { done },
			}),
			invalidatesTags: (_r, _e, { leadId }) => trialChanged(leadId),
		}),
		addChecklistItem: build.mutation<
			ApiResponse<TrialChecklistItem>,
			{ trialId: string; leadId: number; title: string; dayOffset: number }
		>({
			query: ({ trialId, leadId: _leadId, ...body }) => ({ url: `/trials/${trialId}/checklist`, method: "POST", body }),
			invalidatesTags: (_r, _e, { leadId }) => trialChanged(leadId),
		}),
		deleteChecklistItem: build.mutation<
			ApiResponse<{ id: string }>,
			{ trialId: string; itemId: string; leadId: number }
		>({
			query: ({ trialId, itemId }) => ({ url: `/trials/${trialId}/checklist/${itemId}`, method: "DELETE" }),
			invalidatesTags: (_r, _e, { leadId }) => trialChanged(leadId),
		}),
	}),
});
