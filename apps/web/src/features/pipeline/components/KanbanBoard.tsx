import { EmptyState } from "@/components/ui/EmptyState";
import { useLeadDialogs } from "@/features/leads/components/dialogs/LeadDialogsProvider";
import { STAGE_META, STAGE_ORDER } from "@/features/leads/constants";
import { useNotify } from "@/hooks/useNotify";
import { useStageColor } from "@/hooks/useStageColor";
import type { Lead, LeadStage } from "@/store/api/@types/lead.types";
import { useClaimLeadMutation } from "@/store/api/hooks";
import { formatCompactCurrency } from "@/utils/formatters";
import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { CircleCheck, CircleX, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LeadCard } from "./LeadCard";

type DropTarget = LeadStage | "WON" | "LOST";

function DraggableLead({ lead, onClaim }: { lead: Lead; onClaim: (lead: Lead) => void }) {
	const navigate = useNavigate();
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, data: { lead } });
	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			aria-roledescription="Card arrastável"
			aria-label={`${lead.companyName ?? lead.name}. Pressione espaço para mover entre etapas ou Enter para abrir.`}
			onClick={() => navigate(`/leads/${lead.id}`)}
			onKeyDown={(e) => {
				if (e.key === "Enter") navigate(`/leads/${lead.id}`);
				listeners?.onKeyDown?.(e);
			}}
			className="outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--mui-palette-primary-main)]"
		>
			<LeadCard lead={lead} isDragging={isDragging} onClaim={onClaim} />
		</div>
	);
}

function StageColumn({ stage, leads, onClaim }: { stage: LeadStage; leads: Lead[]; onClaim: (lead: Lead) => void }) {
	const { setNodeRef, isOver } = useDroppable({ id: stage });
	const stageColor = useStageColor();
	const total = leads.reduce((acc, l) => acc + (l.estimatedValue ?? 0), 0);
	const color = stageColor(stage);

	return (
		<section
			className="flex flex-col flex-1 min-w-[236px] max-w-[340px] max-h-full"
			aria-label={`Etapa ${STAGE_META[stage].label}`}
			data-cy={`stage-column-${stage}`}
		>
			<Box
				className="rounded-t-xl px-3 pt-3 pb-2.5 border border-b-0"
				sx={{ bgcolor: "background.paper", borderTop: `3px solid ${color} !important` }}
			>
				<div className="flex items-center gap-2">
					<Typography variant="body2" fontWeight={700}>
						{STAGE_META[stage].label}
					</Typography>
					<Box className="px-1.5 rounded text-xs font-semibold tabular-nums" sx={{ bgcolor: "action.selected" }}>
						{leads.length}
					</Box>
					<Tooltip title={STAGE_META[stage].description}>
						<Info size={14} strokeWidth={1.5} className="opacity-50" />
					</Tooltip>
				</div>
				<Typography variant="caption" color="text.secondary" className="tabular-nums">
					{total > 0 ? `${formatCompactCurrency(total)}/mês estimado` : "Sem valor estimado"}
				</Typography>
			</Box>
			<Box
				ref={setNodeRef}
				className="flex-1 overflow-y-auto scrollbar-thin rounded-b-xl border border-t-0 p-2 space-y-2 min-h-[160px]"
				sx={{
					bgcolor: isOver ? "action.selected" : "action.hover",
					outline: isOver ? `2px dashed ${color}` : "none",
					outlineOffset: -4,
					transition: "background-color 120ms",
				}}
			>
				{leads.map((lead) => (
					<DraggableLead key={lead.id} lead={lead} onClaim={onClaim} />
				))}
				{leads.length === 0 && (
					<Typography variant="caption" color="text.disabled" className="block text-center py-8">
						Arraste um lead para cá
					</Typography>
				)}
			</Box>
		</section>
	);
}

function OutcomeDropZone({ id, label, active }: { id: "WON" | "LOST"; label: string; active: boolean }) {
	const { setNodeRef, isOver } = useDroppable({ id });
	const isWon = id === "WON";
	const Icon = isWon ? CircleCheck : CircleX;
	return (
		<Box
			ref={setNodeRef}
			className="flex-1 flex items-center justify-center gap-2 h-16 rounded-xl border-2 border-dashed font-semibold text-sm transition-all"
			sx={{
				borderColor: isWon ? "success.main" : "error.main",
				color: isWon ? "success.main" : "error.main",
				bgcolor: isOver ? (isWon ? "rgba(46,125,50,0.14)" : "rgba(211,47,47,0.12)") : "background.paper",
				transform: active ? "translateY(0)" : "translateY(160%)",
				visibility: active ? "visible" : "hidden",
				opacity: active ? 1 : 0,
				boxShadow: 8,
			}}
		>
			<Icon size={20} strokeWidth={1.5} /> {label}
		</Box>
	);
}

export function KanbanBoard({ leads }: { leads: Lead[] }) {
	const { requestStageChange, openWin, openLose } = useLeadDialogs();
	const notify = useNotify();
	const [claimLead] = useClaimLeadMutation();
	const [activeLead, setActiveLead] = useState<Lead | null>(null);
	const [pendingMoves, setPendingMoves] = useState<Record<number, LeadStage>>({});

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor),
	);

	const columns = useMemo(() => {
		const map = Object.fromEntries(STAGE_ORDER.map((s) => [s, [] as Lead[]])) as Record<LeadStage, Lead[]>;
		for (const lead of leads) map[pendingMoves[lead.id] ?? lead.stage].push(lead);
		return map;
	}, [leads, pendingMoves]);

	const handleClaim = async (lead: Lead) => {
		try {
			await claimLead(lead.id).unwrap();
			notify.success("Lead assumido com sucesso");
		} catch (error) {
			notify.apiError(error);
		}
	};

	const handleDragStart = (event: DragStartEvent) => setActiveLead((event.active.data.current?.lead as Lead) ?? null);

	const handleDragEnd = async (event: DragEndEvent) => {
		setActiveLead(null);
		const lead = event.active.data.current?.lead as Lead | undefined;
		const target = event.over?.id as DropTarget | undefined;
		if (!lead || !target || target === lead.stage) return;
		if (target === "WON") return openWin(lead);
		if (target === "LOST") return openLose(lead);
		const opensDialog =
			target === "TRIAL" || (target === "MEETING" && (lead.stage === "NEW" || lead.stage === "QUALIFICATION"));
		if (!opensDialog) setPendingMoves((p) => ({ ...p, [lead.id]: target }));
		await requestStageChange(lead, target);
		setPendingMoves(({ [lead.id]: _, ...rest }) => rest);
	};

	if (leads.length === 0) {
		return (
			<EmptyState
				title="Nenhum lead em aberto"
				description="Ajuste os filtros ou cadastre um novo lead. Leads do RD Station entram automaticamente em Novo lead."
			/>
		);
	}

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={() => setActiveLead(null)}
		>
			<div className="flex gap-3 overflow-x-auto scrollbar-thin pb-3 h-[calc(100vh-240px)] min-h-[480px]">
				{STAGE_ORDER.map((stage) => (
					<StageColumn key={stage} stage={stage} leads={columns[stage]} onClaim={handleClaim} />
				))}
			</div>
			<div
				className="fixed bottom-5 left-0 right-0 lg:left-[248px] z-30 flex justify-center px-6 pointer-events-none"
				aria-hidden={!activeLead}
			>
				<div className={`flex gap-4 w-full max-w-2xl ${activeLead ? "pointer-events-auto" : ""}`}>
					<OutcomeDropZone id="LOST" label="Perdido" active={!!activeLead} />
					<OutcomeDropZone id="WON" label="Ganho" active={!!activeLead} />
				</div>
			</div>
			<DragOverlay dropAnimation={null}>
				{activeLead && <LeadCard lead={activeLead} isOverlay style={{ width: 280 }} />}
			</DragOverlay>
		</DndContext>
	);
}
