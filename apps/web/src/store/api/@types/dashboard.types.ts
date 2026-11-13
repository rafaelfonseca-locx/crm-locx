import type { UserSummary } from "./common.types";
import type { LeadStage } from "./lead.types";

export type Dashboard = {
	period: { days: number; since: string };
	kpis: {
		newLeads: number;
		newLeadsPrev: number;
		meetings: number;
		trialsStarted: number;
		activeTrials: number;
		won: number;
		wonValue: number;
		lost: number;
		winRate: number | null;
		leadToWinRate: number | null;
		avgCycleDays: number | null;
		openLeads: number;
		pipelineValue: number;
	};
	funnel: { stage: LeadStage | "WON"; count: number }[];
	pipeline: { stage: LeadStage; count: number; value: number }[];
	sources: { source: string; count: number; won: number }[];
	leadsPerDay: { date: string; count: number }[];
	lostReasons: { reason: string; count: number }[];
	team: {
		user: UserSummary;
		openLeads: number;
		pipelineValue: number;
		meetings: number;
		activeTrials: number;
		won: number;
		wonValue: number;
	}[];
	trialsEnding: {
		id: string;
		startDate: string;
		endDate: string;
		checklistDone: number;
		checklistTotal: number;
		lead: {
			id: number;
			name: string;
			companyName: string | null;
			estimatedValue: number | null;
			owner: UserSummary | null;
		};
	}[];
	myAgenda: { overdue: number; today: number };
};

export type RdIntegration = {
	webhookUrl: string | null;
	assignmentMode: "ROUND_ROBIN" | "UNASSIGNED";
	received30d: number;
	lastReceivedAt: string | null;
	logs: {
		id: string;
		status: "PROCESSED" | "UPDATED" | "ERROR";
		message: string | null;
		leadId: number | null;
		email: string | null;
		createdAt: string;
	}[];
};
