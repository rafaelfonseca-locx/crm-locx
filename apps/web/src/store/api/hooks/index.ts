import { activitiesApi } from "../endpoints/activities.endpoints";
import { authApi } from "../endpoints/auth.endpoints";
import { dashboardApi } from "../endpoints/dashboard.endpoints";
import { leadsApi } from "../endpoints/leads.endpoints";
import { trialsApi } from "../endpoints/trials.endpoints";
import { usersApi } from "../endpoints/users.endpoints";

export const { useLoginMutation, useGetMeQuery, useUpdateMeMutation } = authApi;
export const { useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation } = usersApi;
export const {
	useGetLeadsQuery,
	useGetLeadSourcesQuery,
	useGetLeadByIdQuery,
	useGetLeadHistoryQuery,
	useCreateLeadMutation,
	useUpdateLeadMutation,
	useDeleteLeadMutation,
	useMoveLeadStageMutation,
	useWinLeadMutation,
	useLoseLeadMutation,
	useReopenLeadMutation,
	useClaimLeadMutation,
	useTransferLeadMutation,
	useAddParticipantMutation,
	useRemoveParticipantMutation,
} = leadsApi;
export const {
	useGetLeadActivitiesQuery,
	useGetAgendaQuery,
	useCreateActivityMutation,
	useUpdateActivityMutation,
	useDeleteActivityMutation,
} = activitiesApi;
export const {
	useGetTrialsQuery,
	useStartTrialMutation,
	useUpdateTrialMutation,
	useToggleChecklistItemMutation,
	useAddChecklistItemMutation,
	useDeleteChecklistItemMutation,
} = trialsApi;
export const {
	useGetDashboardQuery,
	useGetRdIntegrationQuery,
	useUpdateAssignmentModeMutation,
	useSendRdTestLeadMutation,
} = dashboardApi;
