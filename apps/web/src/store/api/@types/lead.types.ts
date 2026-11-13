import type { UserSummary } from "./common.types";

export type LeadStage = "NEW" | "QUALIFICATION" | "MEETING" | "TRIAL" | "CLOSING";
export type LeadStatus = "OPEN" | "WON" | "LOST";
export type LeadTemperature = "COLD" | "WARM" | "HOT";
export type ParticipantRole = "SDR" | "CLOSER" | "ONBOARDING" | "TECHNICAL" | "OBSERVER";
export type LeadChannel = "DEMO" | "WHATSAPP" | "SITE" | "MANUAL";
/** PROSPECT: cliente em potencial (funil). PARTNER: parceiro que vende por nós e indica clientes. */
export type LeadKind = "PROSPECT" | "PARTNER";
export type BillingCycle = "MONTHLY" | "ANNUAL";
export type TrialStatus = "ACTIVE" | "CONVERTED" | "EXPIRED" | "CANCELED";

export type TrialChecklistItem = {
	id: string;
	trialId: string;
	dayOffset: number;
	title: string;
	position: number;
	done: boolean;
	doneAt: string | null;
	doneById: string | null;
	doneBy?: UserSummary | null;
};

export type Trial = {
	id: string;
	leadId: number;
	startDate: string;
	endDate: string;
	status: TrialStatus;
	accountUrl: string | null;
	notes: string | null;
	checklist: TrialChecklistItem[];
};

export type Participant = { id: string; leadId: number; userId: string; role: ParticipantRole; user: UserSummary };

export type Lead = {
	id: number;
	name: string;
	email: string | null;
	phone: string | null;
	jobTitle: string | null;
	companyName: string | null;
	companySize: string | null;
	segment: string | null;
	website: string | null;
	city: string | null;
	state: string | null;
	stage: LeadStage;
	status: LeadStatus;
	kind: LeadKind;
	referredById: number | null;
	referredBy: { id: number; name: string; companyName: string | null } | null;
	temperature: LeadTemperature | null;
	estimatedValue: number | null;
	plan: string | null;
	billingCycle: BillingCycle | null;
	notes: string | null;
	tags: string[];
	businessType: string | null;
	managementRole: string | null;
	contractsRange: string | null;
	currentTool: string | null;
	startTimeline: string | null;
	channel: LeadChannel;
	source: string;
	utmSource: string | null;
	utmMedium: string | null;
	utmCampaign: string | null;
	conversionIdentifier: string | null;
	conversionCount: number;
	rdLeadId: string | null;
	rdPublicUrl: string | null;
	lostReason: string | null;
	ownerId: string | null;
	owner: UserSummary | null;
	participants: Participant[];
	trial: Trial | null;
	nextActivity: { id: string; type: "TASK" | "MEETING"; title: string | null; dueAt: string | null } | null;
	/** Ganho/perdido: o responsável (ou quem marcou, se não havia responsável) */
	closedBy: UserSummary | null;
	closedMarkedBy: UserSummary | null;
	stageChangedAt: string;
	wonAt: string | null;
	lostAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type LeadListParams = {
	search?: string;
	stage?: LeadStage;
	status?: LeadStatus | "ALL";
	kind?: LeadKind | "ALL";
	referredById?: number;
	ownerId?: string;
	mine?: boolean;
	source?: string;
	channel?: LeadChannel;
	temperature?: LeadTemperature;
	skip?: number;
	take?: number;
	orderByColumn?: string;
	orderByAsc?: boolean;
};

export type LeadPayload = Partial<{
	name: string;
	email: string | null;
	phone: string | null;
	jobTitle: string | null;
	companyName: string | null;
	companySize: string | null;
	segment: string | null;
	website: string | null;
	city: string | null;
	state: string | null;
	temperature: LeadTemperature | null;
	estimatedValue: number | null;
	plan: string | null;
	billingCycle: BillingCycle | null;
	notes: string | null;
	tags: string[];
	source: string;
	channel: LeadChannel;
	businessType: string | null;
	managementRole: string | null;
	contractsRange: string | null;
	currentTool: string | null;
	startTimeline: string | null;
	ownerId: string | null;
	stage: LeadStage;
	referredById: number | null;
}>;

export type Partner = {
	id: number;
	name: string;
	companyName: string | null;
	email: string | null;
	phone: string | null;
	owner: UserSummary | null;
	createdAt: string;
	stats: {
		referrals: number;
		open: number;
		won: number;
		lost: number;
		wonValue: number;
		lastReferralAt: string | null;
	};
};

export type StageEvent = {
	id: string;
	fromStage: LeadStage | null;
	toStage: LeadStage;
	fromStatus: LeadStatus | null;
	toStatus: LeadStatus;
	user: UserSummary | null;
	createdAt: string;
};
