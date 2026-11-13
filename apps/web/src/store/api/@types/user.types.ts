import type { Role, UserSummary } from "./common.types";

export type CurrentUser = UserSummary & {
	receivesLeads: boolean;
	active: boolean;
	mustChangePassword: boolean;
	onboardedAt: string | null;
};

export type TeamMember = UserSummary & {
	active: boolean;
	receivesLeads: boolean;
	lastAssignedAt: string | null;
	createdAt: string;
	stats: { openLeads: number; activeTrials: number; won: number };
};

export type UserPayload = {
	name?: string;
	email?: string;
	password?: string;
	role?: Role;
	color?: string;
	receivesLeads?: boolean;
	active?: boolean;
};
