import type { UserSummary } from "./common.types";
import type { LeadStage, LeadStatus } from "./lead.types";

export type ActivityType = "NOTE" | "CALL" | "EMAIL" | "WHATSAPP" | "MEETING" | "TASK" | "STAGE_CHANGE" | "SYSTEM";

export type Activity = {
	id: string;
	leadId: number;
	type: ActivityType;
	title: string | null;
	body: string | null;
	dueAt: string | null;
	completedAt: string | null;
	meetingUrl: string | null;
	metadata: Record<string, unknown> | null;
	author: UserSummary | null;
	assignee: UserSummary | null;
	lead: { id: number; name: string; companyName: string | null; stage: LeadStage; status: LeadStatus };
	createdAt: string;
};

export type ActivityPayload = {
	type: Exclude<ActivityType, "STAGE_CHANGE" | "SYSTEM">;
	title?: string | null;
	body?: string | null;
	dueAt?: string | null;
	meetingUrl?: string | null;
	assigneeId?: string | null;
	completed?: boolean;
	moveToMeetingStage?: boolean;
};

export type AgendaParams = {
	scope: "mine" | "team";
	userId?: string;
	types?: string;
	status?: "open" | "done" | "all";
	from?: string;
	to?: string;
};
