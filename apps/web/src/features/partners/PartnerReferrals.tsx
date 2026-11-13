import { LoadingContent } from "@/components/feedback/LoadingContent";
import { EmptyState } from "@/components/ui/EmptyState";
import { StageChip } from "@/components/ui/StageChip";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { Lead } from "@/store/api/@types/lead.types";
import { useGetLeadsQuery } from "@/store/api/hooks";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Handshake, Plus } from "lucide-react";
import { useNavigate } from "react-router";

function Stat({ label, value }: { label: string; value: string | number }) {
	return (
		<div>
			<Typography variant="caption" color="text.secondary" component="div">
				{label}
			</Typography>
			<Typography variant="h6" fontWeight={700} className="tabular-nums">
				{value}
			</Typography>
		</div>
	);
}

/** Clientes que o parceiro indicou e o resultado de cada um. */
export function PartnerReferrals({ partner, onNewReferral }: { partner: Lead; onNewReferral: () => void }) {
	const navigate = useNavigate();
	const { data, isLoading } = useGetLeadsQuery({
		referredById: partner.id,
		status: "ALL",
		kind: "ALL",
		take: 500,
		orderByColumn: "createdAt",
	});
	const leads = data?.data ?? [];
	const won = leads.filter((l) => l.status === "WON");
	const wonValue = won.reduce((acc, l) => acc + (l.estimatedValue ?? 0), 0);

	return (
		<Paper className="rounded-xl p-4 space-y-4" sx={{ border: 1, borderColor: "divider" }}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<Typography variant="subtitle2" fontWeight={700}>
						Indicações do parceiro
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Vendemos por meio do parceiro: cada cliente indicado entra no funil normalmente.
					</Typography>
				</div>
				<Button
					size="small"
					startIcon={<Plus size={16} strokeWidth={1.5} />}
					onClick={onNewReferral}
					data-cy="partner-new-referral"
				>
					Nova indicação
				</Button>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<Stat label="Indicações" value={leads.length} />
				<Stat label="Em aberto" value={leads.filter((l) => l.status === "OPEN").length} />
				<Stat label="Vendas" value={won.length} />
				<Stat label="Receita gerada" value={`${formatCurrency(wonValue)}/mês`} />
			</div>
			{isLoading ? (
				<LoadingContent />
			) : leads.length === 0 ? (
				<EmptyState
					icon={<Handshake size={36} strokeWidth={1.5} />}
					title="Nenhuma indicação ainda"
					description="Cadastre aqui os clientes que o parceiro trouxer, ou escolha o parceiro em “Indicado por” ao editar um lead."
				/>
			) : (
				<div className="overflow-x-auto">
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Cliente</TableCell>
								<TableCell>Situação</TableCell>
								<TableCell>Responsável</TableCell>
								<TableCell align="right">Valor/mês</TableCell>
								<TableCell>Indicado em</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{leads.map((lead) => (
								<TableRow
									key={lead.id}
									hover
									className="cursor-pointer"
									onClick={() => navigate(`/leads/${lead.id}`)}
									data-cy={`referral-${lead.id}`}
								>
									<TableCell>
										<Typography variant="body2" fontWeight={600} noWrap>
											{lead.companyName ?? lead.name}
										</Typography>
										<Typography variant="caption" color="text.secondary" noWrap component="div">
											{lead.name}
										</Typography>
									</TableCell>
									<TableCell>
										<StageChip stage={lead.stage} status={lead.status} />
									</TableCell>
									<TableCell>
										{lead.owner ? (
											<span className="inline-flex items-center gap-2">
												<UserAvatar user={lead.owner} size={22} />
												<Typography variant="body2" noWrap>
													{lead.owner.name}
												</Typography>
											</span>
										) : (
											<Typography variant="body2" color="text.secondary">
												Sem responsável
											</Typography>
										)}
									</TableCell>
									<TableCell align="right" className="tabular-nums">
										{lead.estimatedValue !== null ? formatCurrency(lead.estimatedValue) : "N/A"}
									</TableCell>
									<TableCell>{formatShortDate(lead.createdAt)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</Paper>
	);
}
