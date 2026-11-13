import { LoadingContent } from "@/components/feedback/LoadingContent";
import { PageActions, PageHeader, PageSimple, PageTitle } from "@/components/layout/Page";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { HorizontalBars, KpiTile, Panel, useSeriesColor } from "@/features/dashboard/components";
import { CHANNEL_META, STAGE_META } from "@/features/leads/constants";
import { trialDaysLeftLabel } from "@/features/trials/trialProgress";
import { useAuth } from "@/hooks/useAuth";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useStageColor } from "@/hooks/useStageColor";
import type { Dashboard } from "@/store/api/@types/dashboard.types";
import { useGetDashboardQuery, useGetUsersQuery } from "@/store/api/hooks";
import { formatCompactCurrency, formatCurrency, formatPercent, formatShortDate } from "@/utils/formatters";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { format } from "date-fns";
import { differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	AlarmClock,
	CalendarCheck,
	CalendarClock,
	CircleDollarSign,
	FlaskConical,
	Gauge,
	Hourglass,
	Inbox,
	Percent,
	Trophy,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

const PERIODS = [
	{ value: 7, label: "7 dias" },
	{ value: 30, label: "30 dias" },
	{ value: 90, label: "90 dias" },
];

function TodayStrip({ data }: { data: Dashboard }) {
	const items = [
		{
			to: "/agenda",
			label: "Atividades atrasadas",
			value: data.myAgenda.overdue,
			icon: AlarmClock,
			tone: data.myAgenda.overdue > 0 ? "error.main" : "text.secondary",
		},
		{ to: "/agenda", label: "Para hoje", value: data.myAgenda.today, icon: CalendarClock, tone: "text.primary" },
		{
			to: "/trials",
			label: "Trials terminando em até 2 dias",
			value: data.trialsEnding.length,
			icon: FlaskConical,
			tone: data.trialsEnding.length > 0 ? "warning.main" : "text.secondary",
		},
	];
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
			{items.map(({ to, label, value, icon: Icon, tone }) => (
				<ButtonBase key={label} component={Link} to={to} className="!justify-start !rounded-xl">
					<Paper
						className="w-full rounded-xl px-4 py-3 flex items-center gap-3"
						sx={{ border: 1, borderColor: "divider", "&:hover": { borderColor: "text.disabled" } }}
					>
						<Box
							className="flex items-center justify-center w-9 h-9 rounded-lg"
							sx={{ bgcolor: "action.hover", color: tone }}
						>
							<Icon size={18} strokeWidth={1.5} />
						</Box>
						<div className="text-left">
							<Typography className="text-xl font-bold tabular-nums leading-none" sx={{ color: tone }}>
								{value}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{label}
							</Typography>
						</div>
					</Paper>
				</ButtonBase>
			))}
		</div>
	);
}

function FunnelPanel({ data }: { data: Dashboard }) {
	const labelFor = (stage: string) =>
		stage === "WON" ? "Venda ganha" : STAGE_META[stage as keyof typeof STAGE_META].label;
	const first = data.funnel[0]?.count ?? 0;
	return (
		<Panel
			title="Funil de conversão"
			info="Dos leads que entraram no período, quantos chegaram a cada etapa. A porcentagem à direita é a conversão a partir da etapa anterior."
			subtitle={`Leads que entraram nos últimos ${data.period.days} dias e até onde chegaram`}
		>
			{first === 0 ? (
				<EmptyState compact title="Nenhum lead no período" />
			) : (
				<HorizontalBars
					labelWidth={120}
					rows={data.funnel.map((step, i) => {
						const prev = i > 0 ? data.funnel[i - 1].count : null;
						const rate = prev ? step.count / prev : null;
						return {
							key: step.stage,
							label: labelFor(step.stage),
							value: step.count,
							display: String(step.count),
							tooltip: `${labelFor(step.stage)}: ${step.count} leads (${formatPercent(step.count / first)} do total)`,
							aside:
								rate !== null ? (
									<Typography
										variant="caption"
										color="text.secondary"
										className="tabular-nums"
										title="Conversão a partir da etapa anterior"
									>
										{formatPercent(rate)}
									</Typography>
								) : (
									<Typography variant="caption" color="text.disabled">
										—
									</Typography>
								),
						};
					})}
				/>
			)}
		</Panel>
	);
}

function PipelinePanel({ data }: { data: Dashboard }) {
	const stageColor = useStageColor();
	const total = data.pipeline.reduce((a, s) => a + s.count, 0) || 1;
	return (
		<Panel
			title="Pipeline atual"
			info="Todos os leads em aberto agora, por etapa, com o valor mensal estimado."
			subtitle={`${data.kpis.openLeads} leads em aberto · ${formatCurrency(data.kpis.pipelineValue)}/mês estimado`}
			action={
				<Typography
					component={Link}
					to="/pipeline"
					variant="caption"
					fontWeight={600}
					sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
				>
					Abrir pipeline
				</Typography>
			}
		>
			<div
				className="flex h-3 rounded-full overflow-hidden gap-[2px]"
				role="img"
				aria-label="Distribuição dos leads por etapa"
			>
				{data.pipeline.map((s) => (
					<Box key={s.stage} sx={{ width: `${(s.count / total) * 100}%`, bgcolor: stageColor(s.stage) }} />
				))}
			</div>
			<ul className="divide-y">
				{data.pipeline.map((s) => (
					<li key={s.stage} className="flex items-center gap-3 py-2">
						<Box className="w-2.5 h-2.5 rounded-full shrink-0" sx={{ bgcolor: stageColor(s.stage) }} />
						<Typography variant="body2" className="flex-1">
							{STAGE_META[s.stage].label}
						</Typography>
						<Typography variant="body2" fontWeight={600} className="tabular-nums w-10 text-right">
							{s.count}
						</Typography>
						<Typography variant="caption" color="text.secondary" className="tabular-nums w-20 text-right">
							{s.value > 0 ? formatCompactCurrency(s.value) : "—"}
						</Typography>
					</li>
				))}
			</ul>
		</Panel>
	);
}

function LeadsPerDayPanel({ data }: { data: Dashboard }) {
	const color = useSeriesColor();
	const series = data.leadsPerDay;
	return (
		<Panel title="Leads recebidos por dia" subtitle={`${data.kpis.newLeads} no período`}>
			<div className="h-[220px] -mx-2">
				<BarChart
					dataset={series}
					xAxis={[
						{
							scaleType: "band",
							dataKey: "date",
							valueFormatter: (v: string, ctx) =>
								format(new Date(`${v}T12:00:00`), ctx.location === "tooltip" ? "EEEE, dd/MM" : "dd/MM", {
									locale: ptBR,
								}),
							tickLabelInterval: (_v, i) => i % Math.ceil(series.length / 8) === 0,
							disableTicks: true,
						},
					]}
					yAxis={[{ tickMinStep: 1, disableTicks: true }]}
					series={[{ dataKey: "count", label: "Leads", color, valueFormatter: (v) => `${v ?? 0} leads` }]}
					borderRadius={4}
					grid={{ horizontal: true }}
					slotProps={{ legend: { hidden: true } }}
					margin={{ top: 10, right: 10, bottom: 28, left: 32 }}
					sx={{
						"& .MuiChartsGrid-line": { strokeDasharray: "3 3", opacity: 0.5 },
						"& .MuiChartsAxis-line": { display: "none" },
					}}
				/>
			</div>
		</Panel>
	);
}

function ChannelsPanel({ data }: { data: Dashboard }) {
	return (
		<Panel
			title="Canal de entrada"
			subtitle="Leads do período e quantos viraram venda"
			info="Demonstração = agendou pelo Cal.com. WhatsApp e Site = formulários curtos, que precisam de pré-atendimento."
		>
			{data.channels.length === 0 ? (
				<EmptyState compact />
			) : (
				<HorizontalBars
					labelWidth={110}
					rows={data.channels.map((s) => ({
						key: s.channel,
						label: CHANNEL_META[s.channel].short,
						value: s.count,
						display: String(s.count),
						tooltip: `${CHANNEL_META[s.channel].label}: ${s.count} leads, ${s.won} vendas`,
						aside: (
							<Typography variant="caption" color="text.secondary" className="tabular-nums">
								{s.won} {s.won === 1 ? "venda" : "vendas"}
							</Typography>
						),
					}))}
				/>
			)}
		</Panel>
	);
}

/** Cada venda do período, com quem fechou: o "quem vendeu o quê" do time. */
function WonDealsPanel({ data }: { data: Dashboard }) {
	const navigate = useNavigate();
	const total = data.wonDeals.reduce((acc, d) => acc + (d.value ?? 0), 0);
	return (
		<Panel
			title="Vendas fechadas"
			subtitle={`${data.wonDeals.length} ${data.wonDeals.length === 1 ? "venda" : "vendas"} nos últimos ${data.period.days} dias · ${formatCurrency(total)}/mês`}
			info="Quem fechou é o responsável pelo lead (ou quem marcou como Ganho, se não havia responsável)."
			action={
				<Typography
					component={Link}
					to="/leads?status=WON"
					variant="caption"
					fontWeight={600}
					sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
				>
					Ver todas
				</Typography>
			}
		>
			{data.wonDeals.length === 0 ? (
				<EmptyState compact icon={<Trophy size={28} strokeWidth={1.5} />} title="Nenhuma venda no período" />
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-[13px]">
						<thead>
							<tr className="text-left border-b">
								{["Cliente", "Fechado por", "Plano", "Valor/mês", "Ciclo", "Data"].map((h, i) => (
									<Typography
										key={h}
										component="th"
										variant="caption"
										color="text.secondary"
										fontWeight={600}
										className={`py-2 ${i >= 3 ? "text-right px-2" : "pr-3"}`}
									>
										{h}
									</Typography>
								))}
							</tr>
						</thead>
						<tbody>
							{data.wonDeals.map((deal) => (
								<tr
									key={deal.id}
									className="border-b last:border-b-0 cursor-pointer hover:bg-[var(--mui-palette-action-hover)]"
									onClick={() => navigate(`/leads/${deal.id}`)}
									onKeyDown={(e) => e.key === "Enter" && navigate(`/leads/${deal.id}`)}
									data-cy={`won-deal-${deal.id}`}
								>
									<td className="py-2.5 pr-3">
										<div className="font-semibold truncate max-w-[260px]">{deal.companyName ?? deal.name}</div>
										{deal.companyName && <div className="text-xs opacity-60 truncate max-w-[260px]">{deal.name}</div>}
									</td>
									<td className="pr-3">
										<div className="flex items-center gap-2">
											<UserAvatar user={deal.closedBy} size={26} tooltip={false} />
											<span className="font-medium truncate">{deal.closedBy?.name ?? "Não registrado"}</span>
										</div>
									</td>
									<td className="pr-3 whitespace-nowrap">
										{deal.plan
											? `${deal.plan}${deal.billingCycle === "ANNUAL" ? " anual" : deal.billingCycle ? " mensal" : ""}`
											: "—"}
									</td>
									<td className="text-right px-2 tabular-nums font-semibold">
										{deal.value !== null ? formatCurrency(deal.value) : "—"}
									</td>
									<td className="text-right px-2 tabular-nums">
										{deal.cycleDays !== null ? `${deal.cycleDays} dias` : "—"}
									</td>
									<td className="text-right px-2 tabular-nums">{formatShortDate(deal.wonAt)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Panel>
	);
}

function TeamPanel({ data }: { data: Dashboard }) {
	return (
		<Panel
			title="Desempenho do time"
			info="Vendas e receita do período; leads em aberto e trials ativos são a carteira atual de cada pessoa."
			subtitle={`Vendas nos últimos ${data.period.days} dias e carteira atual`}
		>
			<div className="overflow-x-auto">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="text-left border-b">
							{["Vendedor", "Em aberto", "Reuniões", "Trials", "Vendas", "Receita nova"].map((h, i) => (
								<Typography
									key={h}
									component="th"
									variant="caption"
									color="text.secondary"
									fontWeight={600}
									className={`py-2 ${i > 0 ? "text-right px-2" : ""}`}
								>
									{h}
								</Typography>
							))}
						</tr>
					</thead>
					<tbody>
						{data.team
							.filter((row) => row.user.role === "SALES" || row.openLeads > 0 || row.won > 0)
							.map((row) => (
								<tr key={row.user.id} className="border-b last:border-b-0">
									<td className="py-2.5">
										<div className="flex items-center gap-2">
											<UserAvatar user={row.user} size={26} tooltip={false} />
											<span className="font-medium truncate">{row.user.name}</span>
										</div>
									</td>
									<td className="text-right px-2 tabular-nums">{row.openLeads}</td>
									<td className="text-right px-2 tabular-nums">{row.meetings}</td>
									<td className="text-right px-2 tabular-nums">{row.activeTrials}</td>
									<td className="text-right px-2 tabular-nums font-semibold">{row.won}</td>
									<td className="text-right px-2 tabular-nums font-semibold">{formatCurrency(row.wonValue)}</td>
								</tr>
							))}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

function TrialsEndingPanel({ data }: { data: Dashboard }) {
	const navigate = useNavigate();
	return (
		<Panel title="Trials terminando" subtitle="Ativos com prazo em até 2 dias ou vencidos">
			{data.trialsEnding.length === 0 ? (
				<EmptyState compact icon={<FlaskConical size={28} strokeWidth={1.5} />} title="Nenhum trial perto do fim" />
			) : (
				<ul className="space-y-1">
					{data.trialsEnding.map((t) => {
						const daysLeft = differenceInCalendarDays(new Date(t.endDate), new Date());
						return (
							<li key={t.id}>
								<ButtonBase
									onClick={() => navigate(`/leads/${t.lead.id}?aba=trial`)}
									className="w-full !justify-start !rounded-lg px-2 py-2 gap-3 hover:bg-[var(--mui-palette-action-hover)]"
								>
									<UserAvatar user={t.lead.owner} size={26} />
									<div className="flex-1 min-w-0 text-left">
										<Typography variant="body2" fontWeight={600} noWrap>
											{t.lead.companyName ?? t.lead.name}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Checklist {t.checklistDone}/{t.checklistTotal}
										</Typography>
									</div>
									<Typography variant="caption" fontWeight={600} color={daysLeft < 0 ? "error.main" : "warning.main"}>
										{trialDaysLeftLabel(daysLeft)}
									</Typography>
								</ButtonBase>
							</li>
						);
					})}
				</ul>
			)}
		</Panel>
	);
}

function LostReasonsPanel({ data }: { data: Dashboard }) {
	const total = data.lostReasons.reduce((a, r) => a + r.count, 0);
	return (
		<Panel title="Motivos de perda" subtitle={`${total} ${total === 1 ? "lead perdido" : "leads perdidos"} no período`}>
			{total === 0 ? (
				<EmptyState compact title="Nenhuma perda no período" />
			) : (
				<ul className="space-y-2.5">
					{data.lostReasons.map((r) => (
						<li key={r.reason} className="space-y-1">
							<div className="flex justify-between">
								<Typography variant="body2">{r.reason}</Typography>
								<Typography variant="body2" fontWeight={600} className="tabular-nums">
									{r.count}
								</Typography>
							</div>
							<LinearProgress
								variant="determinate"
								value={(r.count / total) * 100}
								color="inherit"
								sx={{ color: "text.disabled" }}
								aria-label={`${r.reason}: ${r.count}`}
							/>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}

export function DashboardPage() {
	const { user, isManager } = useAuth();
	const [prefs, setPrefs] = usePersistentState("dashboardPrefs", { days: 30, ownerId: "" });
	const { data: users } = useGetUsersQuery();
	const { data, isLoading, isFetching } = useGetDashboardQuery({
		days: prefs.days,
		ownerId: prefs.ownerId || undefined,
	});
	const dashboard = data?.data;
	const k = dashboard?.kpis;
	const delta = k && k.newLeadsPrev > 0 ? (k.newLeads - k.newLeadsPrev) / k.newLeadsPrev : null;

	return (
		<PageSimple
			header={
				<PageHeader>
					<PageTitle
						title={`Olá, ${user?.name.split(" ")[0] ?? ""}`}
						icon={<Gauge strokeWidth={1.5} size={16} />}
						subInfo={format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
					/>
					<PageActions>
						<TextField
							select
							size="small"
							value={prefs.ownerId}
							onChange={(e) => setPrefs({ ...prefs, ownerId: e.target.value })}
							sx={{ width: 190 }}
							fullWidth={false}
							aria-label="Filtrar por comercial"
							slotProps={{ select: { displayEmpty: true } }}
						>
							<MenuItem value="">{isManager ? "Equipe toda" : "Toda a equipe"}</MenuItem>
							{(users?.data ?? []).map((u) => (
								<MenuItem key={u.id} value={u.id}>
									{u.name}
								</MenuItem>
							))}
						</TextField>
						<ToggleButtonGroup
							exclusive
							size="small"
							value={prefs.days}
							onChange={(_, v) => v && setPrefs({ ...prefs, days: v })}
							aria-label="Período"
							sx={{ "& .MuiToggleButton-root": { height: 36, px: 1.5, textTransform: "none", fontWeight: 600 } }}
						>
							{PERIODS.map((p) => (
								<ToggleButton key={p.value} value={p.value}>
									{p.label}
								</ToggleButton>
							))}
						</ToggleButtonGroup>
					</PageActions>
				</PageHeader>
			}
			content={
				isLoading || !dashboard || !k ? (
					<LoadingContent />
				) : (
					<div className="space-y-4" style={{ opacity: isFetching ? 0.7 : 1, transition: "opacity 150ms" }}>
						<TodayStrip data={dashboard} />
						<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
							<KpiTile
								label="Novos leads"
								info="Leads que entraram no período, comparado com o período anterior de mesmo tamanho."
								value={String(k.newLeads)}
								delta={delta}
								hint="vs. anterior"
								icon={<Inbox size={16} strokeWidth={1.5} />}
							/>
							<KpiTile
								label="Reuniões"
								info="Reuniões (demonstrações) criadas no período, pelo time ou pelo Cal.com."
								value={String(k.meetings)}
								icon={<CalendarCheck size={16} strokeWidth={1.5} />}
							/>
							<KpiTile
								label="Trials"
								info="Testes gratuitos de 5 a 7 dias iniciados no período."
								value={String(k.trialsStarted)}
								hint={`${k.activeTrials} ativos agora`}
								icon={<FlaskConical size={16} strokeWidth={1.5} />}
							/>
							<KpiTile
								label="Vendas"
								info="Leads marcados como Ganho no período. Clique para ver a lista com quem fechou."
								to="/leads?status=WON"
								value={String(k.won)}
								hint={`${k.lost} perdidos`}
								icon={<Trophy size={16} strokeWidth={1.5} />}
							/>
							<KpiTile
								label="MRR novo"
								info="Soma do valor mensal das vendas do período. Planos anuais contam pelo valor mensal com desconto."
								value={formatCurrency(k.wonValue)}
								icon={<CircleDollarSign size={16} strokeWidth={1.5} />}
							/>
							<KpiTile
								label="Taxa de ganho"
								info="Das oportunidades encerradas no período, quantas foram ganhas (ganhos ÷ ganhos + perdidos)."
								value={formatPercent(k.winRate)}
								hint="dos encerrados"
								icon={<Percent size={16} strokeWidth={1.5} />}
							/>
							<KpiTile
								label="Ciclo de venda"
								info="Tempo médio entre a chegada do lead e a venda, nas vendas do período."
								value={k.avgCycleDays === null ? "N/A" : `${Math.round(k.avgCycleDays)} dias`}
								icon={<Hourglass size={16} strokeWidth={1.5} />}
							/>
						</div>
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
							<div className="lg:col-span-7">
								<FunnelPanel data={dashboard} />
							</div>
							<div className="lg:col-span-5">
								<PipelinePanel data={dashboard} />
							</div>
							<div className="lg:col-span-12">
								<WonDealsPanel data={dashboard} />
							</div>
							<div className="lg:col-span-7">
								<LeadsPerDayPanel data={dashboard} />
							</div>
							<div className="lg:col-span-5">
								<ChannelsPanel data={dashboard} />
							</div>
							<div className="lg:col-span-7">
								<TeamPanel data={dashboard} />
							</div>
							<div className="lg:col-span-5 space-y-4">
								<TrialsEndingPanel data={dashboard} />
								<LostReasonsPanel data={dashboard} />
							</div>
						</div>
					</div>
				)
			}
		/>
	);
}
