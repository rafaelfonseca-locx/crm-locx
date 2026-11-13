import { LoadingContent } from "@/components/feedback/LoadingContent";
import { PageHeader, PageSimple, PageTitle } from "@/components/layout/Page";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useNotify } from "@/hooks/useNotify";
import type { RdIntegration } from "@/store/api/@types/dashboard.types";
import {
	useGetRdIntegrationQuery,
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
import { CircleCheck, CircleX, Copy, Plug, RefreshCw, Send } from "lucide-react";
import { Link } from "react-router";

const LOG_STATUS = {
	PROCESSED: { label: "Lead criado", color: "success" as const, icon: CircleCheck },
	UPDATED: { label: "Conversão registrada", color: "info" as const, icon: RefreshCw },
	ERROR: { label: "Erro", color: "error" as const, icon: CircleX },
};

const STEPS = [
	"No RD Station Marketing, acesse Conta › Integrações › Webhooks.",
	"Crie um webhook com o gatilho Conversão (opcionalmente filtrando pelos formulários de demonstração e teste grátis).",
	"Cole a URL abaixo e salve. Cada nova conversão vira um lead em “Novo lead”, com origem, UTMs e conversão preenchidos.",
	"Conversões de quem já está no CRM são registradas no histórico do lead, sem duplicar. Leads perdidos que convertem de novo são reabertos.",
];

export function IntegrationsPage() {
	const notify = useNotify();
	const { isManager } = useAuth();
	const { data, isLoading, refetch, isFetching } = useGetRdIntegrationQuery();
	const [updateMode, { isLoading: isSavingMode }] = useUpdateAssignmentModeMutation();
	const [sendTest, { isLoading: isSending }] = useSendRdTestLeadMutation();
	const rd = data?.data;

	const copyUrl = async () => {
		if (!rd?.webhookUrl) return;
		try {
			await navigator.clipboard.writeText(rd.webhookUrl);
			notify.info("URL do webhook copiada");
		} catch {
			notify.info("Não foi possível copiar. Selecione e copie a URL manualmente");
		}
	};

	const handleMode = async (mode: RdIntegration["assignmentMode"]) => {
		try {
			await updateMode({ mode }).unwrap();
			notify.success("Distribuição de leads atualizada");
		} catch (error) {
			notify.apiError(error);
		}
	};

	const handleTest = async () => {
		try {
			await sendTest().unwrap();
			notify.success("Lead de teste recebido. Confira o pipeline");
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
						subInfo="Entrada automática de leads"
					/>
				</PageHeader>
			}
			content={
				isLoading || !rd ? (
					<LoadingContent />
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
						<div className="lg:col-span-7 space-y-4">
							<Paper className="rounded-xl p-5 space-y-5" sx={{ border: 1, borderColor: "divider" }}>
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-center gap-3">
										<Box
											className="flex items-center justify-center w-11 h-11 rounded-lg font-black text-sm"
											sx={{ bgcolor: "#1a1a2e", color: "#fff" }}
											aria-hidden
										>
											RD
										</Box>
										<div>
											<Typography variant="subtitle1" className="font-bold">
												RD Station Marketing
											</Typography>
											<Typography variant="caption" color="text.secondary">
												{rd.lastReceivedAt
													? `Último evento ${timeAgo(rd.lastReceivedAt)}`
													: "Nenhum evento recebido ainda"}{" "}
												· {rd.received30d} leads em 30 dias
											</Typography>
										</div>
									</div>
									<Chip
										size="small"
										color={rd.lastReceivedAt ? "success" : "default"}
										variant="outlined"
										icon={rd.lastReceivedAt ? <CircleCheck size={14} strokeWidth={1.5} /> : undefined}
										label={rd.lastReceivedAt ? "Recebendo" : "Aguardando"}
									/>
								</div>

								<ol className="space-y-2">
									{STEPS.map((step, i) => (
										<li key={step} className="flex gap-3">
											<Box
												className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0"
												sx={{ bgcolor: "primary.main", color: "#000" }}
											>
												{i + 1}
											</Box>
											<Typography variant="body2" className="pt-0.5">
												{step}
											</Typography>
										</li>
									))}
								</ol>

								{rd.webhookUrl ? (
									<TextField
										label="URL do webhook"
										value={rd.webhookUrl}
										slotProps={{
											htmlInput: { readOnly: true, "data-cy": "rd-webhook-url" },
											input: {
												endAdornment: (
													<InputAdornment position="end">
														<Tooltip title="Copiar URL">
															<IconButton onClick={copyUrl} edge="end" aria-label="Copiar URL do webhook">
																<Copy size={16} strokeWidth={1.5} />
															</IconButton>
														</Tooltip>
													</InputAdornment>
												),
											},
										}}
										helperText="A URL contém o token de segurança. Compartilhe só com quem administra o RD Station."
									/>
								) : (
									<Alert severity="info">Somente a gestão comercial vê a URL do webhook.</Alert>
								)}

								{isManager && (
									<div className="flex flex-wrap gap-2">
										<Button
											variant="outlined"
											color="inherit"
											startIcon={<Send size={16} strokeWidth={1.5} />}
											onClick={handleTest}
											loading={isSending}
											data-cy="rd-send-test"
										>
											Enviar lead de teste
										</Button>
										<Button component={Link} to="/pipeline" variant="text" color="inherit">
											Ver no pipeline
										</Button>
									</div>
								)}
							</Paper>

							<Paper className="rounded-xl p-5 space-y-3" sx={{ border: 1, borderColor: "divider" }}>
								<div>
									<Typography variant="subtitle1" className="font-bold">
										Distribuição dos novos leads
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Como os leads que chegam do RD Station ganham um responsável.
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
													Rodízio entre os comerciais
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Cada lead vai para quem recebeu há mais tempo, com tarefa de primeiro contato em 1 hora.
													Configure quem participa em{" "}
													<Link to="/equipe" className="underline">
														Equipe
													</Link>
													.
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
													O lead entra sem dono e qualquer comercial pode clicar em “Assumir” no pipeline.
												</Typography>
											</div>
										}
									/>
								</RadioGroup>
							</Paper>
						</div>

						<Paper
							className="lg:col-span-5 rounded-xl p-5 space-y-3 self-start"
							sx={{ border: 1, borderColor: "divider" }}
						>
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
										<RefreshCw size={16} strokeWidth={1.5} />
									</IconButton>
								</Tooltip>
							</div>
							{rd.logs.length === 0 ? (
								<EmptyState
									compact
									title="Nenhum evento ainda"
									description="Os eventos aparecem aqui assim que o RD Station enviar a primeira conversão."
								/>
							) : (
								<ul className="divide-y">
									{rd.logs.map((log) => {
										const meta = LOG_STATUS[log.status];
										const Icon = meta.icon;
										return (
											<li key={log.id} className="flex items-start gap-3 py-2.5">
												<Box sx={{ color: `${meta.color}.main` }} className="pt-0.5">
													<Icon size={16} strokeWidth={1.5} />
												</Box>
												<div className="flex-1 min-w-0">
													<Typography variant="body2" fontWeight={500} noWrap>
														{log.email ?? "Sem e-mail"}
													</Typography>
													<Typography variant="caption" color="text.secondary" component="div">
														{meta.label}
														{log.message ? ` · ${log.message}` : ""}
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
					</div>
				)
			}
		/>
	);
}
