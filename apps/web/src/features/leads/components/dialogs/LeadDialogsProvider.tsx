import { useNotify } from "@/hooks/useNotify";
import type { Lead, LeadStage } from "@/store/api/@types/lead.types";
import { useMoveLeadStageMutation } from "@/store/api/hooks";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { STAGE_META } from "../../constants";
import { LoseLeadDialog, WinLeadDialog } from "./CloseLeadDialogs";
import { LeadFormDialog } from "./LeadFormDialog";
import { ScheduleMeetingDialog } from "./ScheduleMeetingDialog";
import { StartTrialDialog } from "./StartTrialDialog";

type DialogState =
	| { kind: "create"; stage?: LeadStage; referredById?: number }
	| { kind: "edit"; lead: Lead }
	| { kind: "meeting"; lead: Lead; fromStageChange?: boolean }
	| { kind: "trial"; lead: Lead }
	| { kind: "win"; lead: Lead }
	| { kind: "lose"; lead: Lead }
	| null;

type LeadDialogsContextValue = {
	openCreateLead: () => void;
	openCreateLeadInStage: (stage: LeadStage) => void;
	/** Nova indicação de um parceiro */
	openCreateReferral: (partnerId: number) => void;
	openEditLead: (lead: Lead) => void;
	openScheduleMeeting: (lead: Lead) => void;
	openStartTrial: (lead: Lead) => void;
	openWin: (lead: Lead) => void;
	openLose: (lead: Lead) => void;
	/** Muda a etapa. Reunião e Trial abrem o diálogo correspondente antes de mover. */
	requestStageChange: (lead: Lead, stage: LeadStage) => Promise<void>;
};

const LeadDialogsContext = createContext<LeadDialogsContextValue | null>(null);

export function LeadDialogsProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<DialogState>(null);
	const navigate = useNavigate();
	const notify = useNotify();
	const [moveStage] = useMoveLeadStageMutation();
	const close = useCallback(() => setState(null), []);

	const requestStageChange = useCallback(
		async (lead: Lead, stage: LeadStage) => {
			if (lead.stage === stage) return;
			if (stage === "TRIAL" && lead.trial?.status !== "ACTIVE") {
				setState({ kind: "trial", lead });
				return;
			}
			if (stage === "MEETING" && (lead.stage === "NEW" || lead.stage === "QUALIFICATION")) {
				setState({ kind: "meeting", lead, fromStageChange: true });
				return;
			}
			try {
				await moveStage({ id: lead.id, stage }).unwrap();
				notify.success(`Lead movido para ${STAGE_META[stage].label}`);
			} catch (error) {
				notify.apiError(error);
			}
		},
		[moveStage, notify],
	);

	const value = useMemo<LeadDialogsContextValue>(
		() => ({
			openCreateLead: () => setState({ kind: "create" }),
			openCreateLeadInStage: (stage) => setState({ kind: "create", stage }),
			openCreateReferral: (partnerId) => setState({ kind: "create", referredById: partnerId }),
			openEditLead: (lead) => setState({ kind: "edit", lead }),
			openScheduleMeeting: (lead) => setState({ kind: "meeting", lead }),
			openStartTrial: (lead) => setState({ kind: "trial", lead }),
			openWin: (lead) => setState({ kind: "win", lead }),
			openLose: (lead) => setState({ kind: "lose", lead }),
			requestStageChange,
		}),
		[requestStageChange],
	);

	const lead = state && "lead" in state ? state.lead : null;

	return (
		<LeadDialogsContext.Provider value={value}>
			{children}
			<LeadFormDialog
				open={state?.kind === "create" || state?.kind === "edit"}
				lead={state?.kind === "edit" ? state.lead : null}
				defaultStage={state?.kind === "create" ? state.stage : undefined}
				defaultReferredById={state?.kind === "create" ? state.referredById : undefined}
				onClose={close}
				onSaved={(saved) => state?.kind === "create" && navigate(`/leads/${saved.id}`)}
			/>
			<ScheduleMeetingDialog
				open={state?.kind === "meeting"}
				lead={lead}
				fromStageChange={state?.kind === "meeting" && state.fromStageChange}
				onClose={close}
			/>
			<StartTrialDialog open={state?.kind === "trial"} lead={lead} onClose={close} />
			<WinLeadDialog open={state?.kind === "win"} lead={lead} onClose={close} />
			<LoseLeadDialog open={state?.kind === "lose"} lead={lead} onClose={close} />
		</LeadDialogsContext.Provider>
	);
}

export function useLeadDialogs() {
	const ctx = useContext(LeadDialogsContext);
	if (!ctx) throw new Error("useLeadDialogs precisa estar dentro de LeadDialogsProvider");
	return ctx;
}
