import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTip } from "@/components/ui/InfoTip";
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
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { CircleCheck, CircleX, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LeadCard } from "./LeadCard";

type DropTarget = LeadStage | "WON" | "LOST";
const ARROW = 12;

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
			className="outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--mui-palette-primary-main)]"
		>
			<LeadCard lead={lead} isDragging={isDragging} onClaim={onClaim} />
		</div>
	);
}

/** Cabeçalho em seta, como uma trilha: etapa, valor somado e quantidade. */
function StageHeader({
	stage,
	index,
	leads,
	onAdd,
}: { stage: LeadStage; index: number; leads: Lead[]; onAdd?: () => void }) {
	const stageColor = useStageColor();
	const total = leads.reduce((acc, l) => acc + (l.estimatedValue ?? 0), 0);
	const isFirst = index === 0;
	const isLast = index === STAGE_ORDER.length - 1;
	const clip = `polygon(0 0, ${isLast ? "100%" : `calc(100% - ${ARROW}px)`} 0, 100% 50%, ${isLast ? "100%" : `calc(100% - ${ARROW}px)`} 100%, 0 100%, ${isFirst ? "0" : `${ARROW}px`} 50%)`;

	return (
		<Box
			className="group relative h-[52px] flex items-center gap-2 pr-5"
			sx={{
				clipPath: clip,
				bgcolor: "background.paper",
				pl: isFirst ? 1.5 : 3,
				mr: isLast ? 0 : `-${ARROW - 4}px`,
				boxShadow: `inset 0 -2px 0 ${stageColor(stage)}`,
			}}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1">
					<Typography variant="body2" fontWeight={700} noWrap>
						{STAGE_META[stage].label}
					</Typography>
					<InfoTip title={STAGE_META[stage].description} size={13} />
				</div>
				<Typography variant="caption" color="text.secondary" className="tabular-nums" noWrap component="div">
					{total > 0 ? `${formatCompactCurrency(total)}/mês · ` : ""}
					{leads.length} {leads.length === 1 ? "lead" : "leads"}
				</Typography>
			</div>
			{onAdd && (
				<Tooltip title={`Novo lead em ${STAGE_META[stage].label}`}>
					<IconButton
						size="small"
						onClick={onAdd}
						className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
						aria-label={`Novo lead em ${STAGE_META[stage].label}`}
					>
						<Plus size={16} strokeWidth={2} />
					</IconButton>
				</Tooltip>
			)}
		</Box>
	);
}

function StageColumn({ stage, leads, onClaim }: { stage: LeadStage; leads: Lead[]; onClaim: (lead: Lead) => void }) {
	const { setNodeRef, isOver } = useDroppable({ id: stage });
	const stageColor = useStageColor();
	return (
		<Box
			ref={setNodeRef}
			className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-1.5 space-y-1.5"
			sx={{
				bgcolor: isOver ? "action.selected" : "transparent",
				outline: isOver ? `2px dashed ${stageColor(stage)}` : "none",
				outlineOffset: -3,
				borderRadius: 2,
				transition: "background-color 120ms",
			}}
			aria-label={`Leads em ${STAGE_META[stage].label}`}
			data-cy={`stage-column-${stage}`}
		>
			{leads.map((lead) => (
				<DraggableLead key={lead.id} lead={lead} onClaim={onClaim} />
			))}
			{leads.length === 0 && (
				<Typography variant="caption" color="text.disabled" className="block text-center py-10">
					Arraste um lead para cá
				</Typography>
			)}
		</Box>
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
				boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
			}}
		>
			<Icon size={20} strokeWidth={1.75} /> {label}
		</Box>
	);
}

export function KanbanBoard({ leads }: { leads: Lead[] }) {
	const { requestStageChange, openWin, openLose, openCreateLeadInStage } = useLeadDialogs();
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
				description="Ajuste os filtros ou cadastre um novo lead. Leads do RD Station entram em Novo lead e os do Cal.com em Reunião."
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
			<div className="flex flex-col h-full min-h-0 min-w-[1000px]">
				<div
					className="flex shrink-0 rounded-t-xl overflow-hidden border-b"
					style={{ filter: "drop-shadow(0 1px 1px rgba(16,24,40,0.04))" }}
				>
					{STAGE_ORDER.map((stage, index) => (
						<div key={stage} className="flex-1 min-w-0" style={{ zIndex: STAGE_ORDER.length - index }}>
							<StageHeader
								stage={stage}
								index={index}
								leads={columns[stage]}
								onAdd={stage === "TRIAL" ? undefined : () => openCreateLeadInStage(stage)}
							/>
						</div>
					))}
				</div>
				<Box className="flex flex-1 min-h-0 gap-1 rounded-b-xl pt-1" sx={{ bgcolor: "surface.column" }}>
					{STAGE_ORDER.map((stage) => (
						<div key={stage} className="flex-1 min-w-0 flex flex-col min-h-0">
							<StageColumn stage={stage} leads={columns[stage]} onClaim={handleClaim} />
						</div>
					))}
				</Box>
			</div>
			<div
				className="fixed bottom-6 left-0 right-0 z-30 flex justify-center px-6 pointer-events-none"
				aria-hidden={!activeLead}
			>
				<div className={`flex gap-4 w-full max-w-2xl ${activeLead ? "pointer-events-auto" : ""}`}>
					<OutcomeDropZone id="LOST" label="Perdido" active={!!activeLead} />
					<OutcomeDropZone id="WON" label="Ganho" active={!!activeLead} />
				</div>
			</div>
			<DragOverlay dropAnimation={null}>
				{activeLead && <LeadCard lead={activeLead} isOverlay style={{ width: 240 }} />}
			</DragOverlay>
		</DndContext>
	);
}
