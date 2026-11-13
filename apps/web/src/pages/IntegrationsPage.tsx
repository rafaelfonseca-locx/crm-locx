import { LoadingContent } from "@/components/feedback/LoadingContent";
import { PageHeader, PageSimple, PageTitle } from "@/components/layout/Page";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTip } from "@/components/ui/InfoTip";
import { LeadConversionsEditor } from "@/features/integrations/LeadConversionsEditor";
import { RdApiConnection } from "@/features/integrations/RdApiConnection";
import { CHANNEL_ICONS } from "@/features/leads/components/ChannelIcon";
import { CHANNEL_META, QUALIFICATION_OPTIONS } from "@/features/leads/constants";
import { useAuth } from "@/hooks/useAuth";
import { useNotify } from "@/hooks/useNotify";
import type { RdIntegration } from "@/store/api/@types/dashboard.types";
import type { LeadChannel } from "@/store/api/@types/lead.types";
import {
	useGetRdIntegrationQuery,
	useSendCalTestBookingMutation,
	useSendRdTestLeadMutation,
	useUpdateAssignmentModeMutation,
} from "@/store/api/hooks";
import { formatDateTime, timeAgo } from "@/utils/formatters";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { CircleCheck, CircleX, Copy, MinusCircle, Plug, RefreshCw, Send } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

const LOG_STATUS = {
	PROCESSED: { label: "Lead criado", color: "success" as const, icon: CircleCheck },
	UPDATED: { label: "Lead atualizado", color: "info" as const, icon: RefreshCw },
	IGNORED: { label: "Ignorado", color: "text" as const, icon: MinusCircle },
	ERROR: { label: "Erro", color: "error" as const, icon: CircleX },
};

const BASIC_QUESTIONS = [
	"Nome completo",
	"E-mail corporativo",
	"WhatsApp",
	"Qual o seu perfil?",
	"Quantos contratos de aluguel você administra?",
];
const FULL_QUESTIONS = [
	...BASIC_QUESTIONS,
	"Estado",
	"Qual seu papel na gestão dos imóveis?",
	"Como você gerencia hoje?",
	"Quando você pretende começar a usar um sistema?",
];

const CHANNELS: { channel: Exclude<LeadChannel, "MANUAL">; flow: string; questions: string[]; identifier: string }[] = [
	{
		channel: "DEMO",
		flow: "Entra em Reunião, com data, horário e link do Cal.com. O vendedor da agenda vira o responsável.",
		questions: FULL_QUESTIONS,
		identifier: "agendou_demonstracao",
	},
	{
		channel: "WHATSAPP",
		flow: "Entra em Novo lead com a tarefa “Fazer o pré-atendimento pelo WhatsApp” em até 1 hora.",
		questions: BASIC_QUESTIONS,
		identifier: "botao-wpp-holding",
	},
	{
		channel: "SITE",
		flow: "Entra em Novo lead com a tarefa “Fazer o primeiro contato” em até 1 hora.",
		questions: BASIC_QUESTIONS,
		identifier: "formulario-lp-re_patrimonial",
	},
];

function CopyField({
	label,
	value,
	helperText,
	dataCy,
}: { label: string; value: string; helperText: string; dataCy: string }) {
	const notify = useNotify();
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			notify.info("URL copiada");
		} catch {
			notify.info("Não foi possível copiar. Selecione e copie a URL manualmente");
		}
	};
	return (
		<TextField
			label={label}
			value={value}
			helperText={helperText}
			slotProps={{
				htmlInput: { readOnly: true, "data-cy": dataCy },
				input: {
					endAdornment: (
						<InputAdornment position="end">
							<Tooltip title="Copiar URL">
								<IconButton onClick={copy} edge="end" aria-label={`Copiar ${label}`}>
									<Copy size={16} strokeWidth={1.75} />
								</IconButton>
							</Tooltip>
						</InputAdornment>
					),
				},
			}}
		/>
	);
}

function Steps({ items }: { items: ReactNode[] }) {
	const keyed = items.map((content, position) => ({ id: `step-${position + 1}`, content }));
	return (
		<ol className="space-y-2">
			{keyed.map(({ id, content }, i) => (
				<li key={id} className="flex gap-3">
					<Box
						className="flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0 mt-px"
						sx={{ bgcolor: "primary.main", color: "#111" }}
					>
						{i + 1}
					</Box>
					<Typography variant="body2">{content}</Typography>
				</li>
			))}
		</ol>
	);
}

function IntegrationCard({
	logo,
	title,
	status,
	children,
}: { logo: ReactNode; title: string; status: { ok: boolean; text: string }; children: ReactNode }) {
	return (
		<Paper className="rounded-xl p-5 space-y-4" sx={{ border: 1, borderColor: "divider" }}>
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-3">
					{logo}
					<div>
						<Typography variant="subtitle1" className="font-bold leading-tight">
							{title}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{status.text}
						</Typography>
					</div>
				</div>
				<Chip
					size="small"
					color={status.ok ? "success" : "default"}
					variant="outlined"
					icon={status.ok ? <CircleCheck size={14} strokeWidth={1.75} /> : undefined}
					label={status.ok ? "Recebendo" : "Aguardando"}
				/>
			</div>
			{children}
		</Paper>
	);
}

export function IntegrationsPage() {
	const notify = useNotify();
	const { isManager } = useAuth();
	const { data, isLoading, refetch, isFetching } = useGetRdIntegrationQuery();
	const [updateMode, { isLoading: isSavingMode }] = useUpdateAssignmentModeMutation();
	const [sendRdTest, { isLoading: isSendingRd, originalArgs }] = useSendRdTestLeadMutation();
	const [sendCalTest, { isLoading: isSendingCal }] = useSendCalTestBookingMutation();
	const rd = data?.data;

	const handleMode = async (mode: RdIntegration["assignmentMode"]) => {
		try {
			await updateMode({ mode }).unwrap();
			notify.success("Distribuição de leads atualizada");
		} catch (error) {
			notify.apiError(error);
		}
	};

	const handleTest = async (channel: Exclude<LeadChannel, "MANUAL">) => {
		try {
			if (channel === "DEMO") await sendCalTest().unwrap();
			else await sendRdTest({ channel }).unwrap();
			notify.success("Lead de teste recebido. Confira no pipeline");
		} catch (error) {
			notify.apiError(error);
		}
	};

	return (
		<PageSimple
			header={
				<PageHeader>
					<PageTitle
						title="Integrações"
						icon={<Plug strokeWidth={1.5} size={16} />}
						subInfo="Como os leads entram no CRM"
					/>
				</PageHeader>
			}
			content={
				isLoading || !rd ? (
					<LoadingContent />
				) : (
					<div className="space-y-6">
						<section className="space-y-3">
							<div className="flex items-center gap-1.5">
								<Typography variant="subtitle1" className="font-bold">
									Canais de entrada
								</Typography>
								<InfoTip title="O canal é identificado pelo identificador da conversão no RD (contém “agend” ou “demo” = demonstração; “whats” ou “wpp” = WhatsApp; formulários da lista abaixo = site). Conversões de conteúdo não criam lead." />
							</div>
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
								{CHANNELS.map(({ channel, flow, questions, identifier }) => {
									const Icon = CHANNEL_ICONS[channel];
									const isSending =
										channel === "DEMO" ? isSendingCal : isSendingRd && originalArgs?.channel === channel;
									return (
										<Paper
											key={channel}
											className="rounded-xl p-4 flex flex-col gap-3"
											sx={{ border: 1, borderColor: "divider" }}
											data-cy={`channel-card-${channel}`}
										>
											<div className="flex items-center gap-2.5">
												<Box
													className="flex items-center justify-center w-9 h-9 rounded-lg"
													sx={{ bgcolor: "rgba(255,204,0,0.2)" }}
												>
													<Icon size={18} strokeWidth={1.75} />
												</Box>
												<div>
													<Typography variant="body2" fontWeight={700}>
														{CHANNEL_META[channel].label}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{questions.length} perguntas · ex.: <code>{identifier}</code>
													</Typography>
												</div>
											</div>
											<Typography variant="body2" color="text.secondary">
												{flow}
											</Typography>
											<ul className="flex flex-wrap gap-1">
												{questions.map((q) => (
													<li key={q}>
														<Chip size="small" label={q} sx={{ bgcolor: "action.hover", fontWeight: 400 }} />
													</li>
												))}
											</ul>
											{isManager && (
												<Button
													size="small"
													variant="outlined"
													color="inherit"
													className="!mt-auto self-start"
													startIcon={<Send size={14} strokeWidth={1.75} />}
													onClick={() => handleTest(channel)}
													loading={isSending}
													data-cy={`test-${channel}`}
												>
													Enviar lead de teste
												</Button>
											)}
										</Paper>
									);
								})}
							</div>
							<Alert severity="info" variant="outlined">
								<b>Respostas padronizadas:</b> use as mesmas opções nos formulários para os relatórios baterem. Perfil:{" "}
								{QUALIFICATION_OPTIONS.businessType.join(", ")}. Contratos:{" "}
								{QUALIFICATION_OPTIONS.contractsRange.join(", ")}. Quando começar:{" "}
								{QUALIFICATION_OPTIONS.startTimeline.join(", ")}.
							</Alert>
						</section>

						<section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							<IntegrationCard
								logo={
									<Box
										className="flex items-center justify-center w-10 h-10 rounded-lg font-black text-sm"
										sx={{ bgcolor: "#1a1a2e", color: "#fff" }}
										aria-hidden
									>
										RD
									</Box>
								}
								title="RD Station Marketing"
								status={{
									ok: !!rd.lastReceivedAt,
									text: `${rd.lastReceivedAt ? `Último evento ${timeAgo(rd.lastReceivedAt)}` : "Nenhum evento ainda"} · ${rd.received30d} leads em 30 dias`,
								}}
							>
								<Steps
									items={[
										"No RD Station: Conta › Integrações › Webhooks › Criar webhook.",
										<span key="k1">
											Gatilho <b>Conversão</b>, filtrando os formulários do site, do WhatsApp e de agendamento.
										</span>,
										"Cole a URL abaixo e salve.",
									]}
								/>
								{rd.webhookUrl ? (
									<CopyField
										label="URL do webhook do RD"
										value={rd.webhookUrl}
										helperText="Contém o token de segurança. Compartilhe só com quem administra o RD."
										dataCy="rd-webhook-url"
									/>
								) : (
									<Alert severity="info">Somente gestores veem a URL do webhook.</Alert>
								)}
								<LeadConversionsEditor identifiers={rd.leadConversions} canEdit={isManager} />
								<RdApiConnection status={rd.rdApi} canEdit={isManager} />
							</IntegrationCard>

							<IntegrationCard
								logo={
									<Box
										className="flex items-center justify-center w-10 h-10 rounded-lg font-bold text-xs"
										sx={{ bgcolor: "#111", color: "#fff" }}
										aria-hidden
									>
										Cal
									</Box>
								}
								title="Cal.com (agendamentos)"
								status={{
									ok: !!rd.calLastReceivedAt,
									text: `${rd.calLastReceivedAt ? `Último evento ${timeAgo(rd.calLastReceivedAt)}` : "Nenhum evento ainda"} · ${rd.calBookings30d} reuniões em 30 dias`,
								}}
							>
								<Steps
									items={[
										"No Cal.com: Settings › Developer › Webhooks › New.",
										<span key="k2">
											Cole a URL abaixo em <b>Subscriber URL</b> e marque <b>Booking Created</b>,{" "}
											<b>Booking Rescheduled</b> e <b>Booking Cancelled</b>.
										</span>,
										<span key="k3">
											O e-mail de quem atende no Cal.com deve ser o mesmo do CRM (veja em{" "}
											<Link to="/equipe" className="underline">
												Equipe
											</Link>
											), para a reunião cair na agenda certa.
										</span>,
									]}
								/>
								{rd.calWebhookUrl ? (
									<CopyField
										label="URL do webhook do Cal.com"
										value={rd.calWebhookUrl}
										helperText="Remarcações e cancelamentos atualizam a reunião no CRM automaticamente."
										dataCy="cal-webhook-url"
									/>
								) : (
									<Alert severity="info">Somente gestores veem a URL do webhook.</Alert>
								)}
							</IntegrationCard>
						</section>

						<section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
							<Paper
								className="lg:col-span-5 rounded-xl p-5 space-y-3 self-start"
								sx={{ border: 1, borderColor: "divider" }}
							>
								<div>
									<Typography variant="subtitle1" className="font-bold">
										Distribuição dos novos leads
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Como os leads que chegam ganham um responsável.
									</Typography>
								</div>
								<RadioGroup
									value={rd.assignmentMode}
									onChange={(e) => handleMode(e.target.value as RdIntegration["assignmentMode"])}
								>
									<FormControlLabel
										value="ROUND_ROBIN"
										disabled={!isManager || isSavingMode}
										control={<Radio />}
										label={
											<div className="py-1">
												<Typography variant="body2" fontWeight={600}>
													Rodízio entre os vendedores
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Cada lead vai para quem recebeu há mais tempo. Quem participa é definido em{" "}
													<Link to="/equipe" className="underline">
														Equipe
													</Link>
													. Agendamentos do Cal.com vão direto para quem vai atender.
												</Typography>
											</div>
										}
									/>
									<FormControlLabel
										value="UNASSIGNED"
										disabled={!isManager || isSavingMode}
										control={<Radio />}
										label={
											<div className="py-1">
												<Typography variant="body2" fontWeight={600}>
													Fila sem responsável
												</Typography>
												<Typography variant="caption" color="text.secondary">
													O lead entra sem dono e qualquer vendedor pode clicar em “Assumir” no pipeline.
												</Typography>
											</div>
										}
									/>
								</RadioGroup>
							</Paper>

							<Paper className="lg:col-span-7 rounded-xl p-5 space-y-3" sx={{ border: 1, borderColor: "divider" }}>
								<div className="flex items-center justify-between">
									<Typography variant="subtitle1" className="font-bold">
										Eventos recebidos
									</Typography>
									<Tooltip title="Atualizar">
										<IconButton
											size="small"
											onClick={() => refetch()}
											disabled={isFetching}
											aria-label="Atualizar eventos"
										>
											<RefreshCw size={16} strokeWidth={1.75} />
										</IconButton>
									</Tooltip>
								</div>
								{rd.logs.length === 0 ? (
									<EmptyState
										compact
										title="Nenhum evento ainda"
										description="Os eventos aparecem aqui assim que o RD Station ou o Cal.com enviarem o primeiro lead."
									/>
								) : (
									<ul className="divide-y">
										{rd.logs.map((log) => {
											const meta = LOG_STATUS[log.status];
											const Icon = meta.icon;
											return (
												<li key={log.id} className="flex items-start gap-3 py-2.5">
													<Box
														sx={{ color: meta.color === "text" ? "text.disabled" : `${meta.color}.main` }}
														className="pt-0.5"
													>
														<Icon size={16} strokeWidth={1.75} />
													</Box>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2">
															<Typography variant="body2" fontWeight={500} noWrap>
																{log.email ?? "Sem e-mail"}
															</Typography>
															<Chip
																size="small"
																label={
																	log.source === "cal.com" ? "Cal.com" : log.source === "rd-sync" ? "CRM → RD" : "RD"
																}
																sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
															/>
														</div>
														<Typography variant="caption" color="text.secondary" component="div">
															{log.message ?? meta.label}
															{log.conversion ? ` · ${log.conversion}` : ""}
														</Typography>
													</div>
													<div className="text-right shrink-0">
														<Typography variant="caption" color="text.secondary" component="div">
															{formatDateTime(log.createdAt)}
														</Typography>
														{log.leadId && (
															<Typography
																component={Link}
																to={`/leads/${log.leadId}`}
																variant="caption"
																fontWeight={600}
																className="hover:underline"
															>
																#{log.leadId}
															</Typography>
														)}
													</div>
												</li>
											);
										})}
									</ul>
								)}
							</Paper>
						</section>
					</div>
				)
			}
		/>
	);
}
