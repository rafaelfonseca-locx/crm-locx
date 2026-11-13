import type { UserSummary } from "./common.types";
import type { LeadChannel, LeadStage } from "./lead.types";

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
	channels: { channel: LeadChannel; count: number; won: number }[];
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
	calWebhookUrl: string | null;
	assignmentMode: "ROUND_ROBIN" | "UNASSIGNED";
	received30d: number;
	calBookings30d: number;
	lastReceivedAt: string | null;
	calLastReceivedAt: string | null;
	logs: {
		id: string;
		source: "rd-station" | "cal.com";
		conversion: string | null;
		status: "PROCESSED" | "UPDATED" | "ERROR";
		message: string | null;
		leadId: number | null;
		email: string | null;
		createdAt: string;
	}[];
};
