import type { ApiResponse } from "../@types/common.types";
import type { Dashboard, RdIntegration } from "../@types/dashboard.types";
import { apiService } from "../apiService";

export const dashboardApi = apiService.injectEndpoints({
	endpoints: (build) => ({
		getDashboard: build.query<ApiResponse<Dashboard>, { days: number; ownerId?: string }>({
			query: ({ days, ownerId }) => ({ url: "/dashboard", params: { days, ...(ownerId ? { ownerId } : {}) } }),
			providesTags: ["Dashboard"],
		}),
		getRdIntegration: build.query<ApiResponse<RdIntegration>, void>({
			query: () => "/integrations/rd-station",
			providesTags: ["Integration"],
		}),
		updateAssignmentMode: build.mutation<ApiResponse<{ mode: string }>, { mode: RdIntegration["assignmentMode"] }>({
			query: (body) => ({ url: "/integrations/settings/assignment", method: "PUT", body }),
			invalidatesTags: ["Integration"],
		}),
		sendRdTestLead: build.mutation<ApiResponse<unknown[]>, { channel: "DEMO" | "WHATSAPP" | "SITE" }>({
			query: (body) => ({ url: "/integrations/rd-station/test", method: "POST", body }),
			invalidatesTags: [
				"Integration",
				{ type: "Lead", id: "LIST" },
				"Dashboard",
				{ type: "Activity", id: "AGENDA" },
				"User",
			],
		}),
		updateLeadConversions: build.mutation<ApiResponse<{ identifiers: string[] }>, { identifiers: string[] }>({
			query: (body) => ({ url: "/integrations/settings/lead-conversions", method: "PUT", body }),
			invalidatesTags: ["Integration"],
		}),
		sendCalTestBooking: build.mutation<ApiResponse<unknown>, void>({
			query: () => ({ url: "/integrations/cal/test", method: "POST" }),
			invalidatesTags: [
				"Integration",
				{ type: "Lead", id: "LIST" },
				"Dashboard",
				{ type: "Activity", id: "AGENDA" },
				"User",
			],
		}),
	}),
});
