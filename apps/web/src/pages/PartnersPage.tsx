import { LoadingContent } from "@/components/feedback/LoadingContent";
import { PageActions, PageHeader, PageSimple, PageTitle } from "@/components/layout/Page";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTip } from "@/components/ui/InfoTip";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { Partner } from "@/store/api/@types/lead.types";
import { useGetPartnersQuery } from "@/store/api/hooks";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Handshake } from "lucide-react";
import { useNavigate } from "react-router";

function Metric({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
	return (
		<div>
			<Typography variant="caption" color="text.secondary" component="div">
				{label}
			</Typography>
			<Typography
				variant="body2"
				fontWeight={700}
				className="tabular-nums"
				color={highlight ? "success.main" : "text.primary"}
			>
				{value}
			</Typography>
		</div>
	);
}

function PartnerCard({ partner }: { partner: Partner }) {
	const navigate = useNavigate();
	const { stats } = partner;
	return (
		<ButtonBase
			onClick={() => navigate(`/leads/${partner.id}`)}
			className="!block !text-left !rounded-xl w-full"
			data-cy={`partner-card-${partner.id}`}
		>
			<Paper
				className="rounded-xl p-4 space-y-4 h-full"
				sx={{ border: 1, borderColor: "divider", "&:hover": { borderColor: "text.disabled" } }}
			>
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-start gap-3 min-w-0">
						<Box
							className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
							sx={{ bgcolor: "action.hover", color: "text.secondary" }}
						>
							<Handshake size={18} strokeWidth={1.5} />
						</Box>
						<div className="min-w-0">
							<Typography variant="body2" fontWeight={700} noWrap>
								{partner.companyName ?? partner.name}
							</Typography>
							<Typography variant="caption" color="text.secondary" noWrap component="div">
								{partner.name}
								{partner.email ? ` · ${partner.email}` : ""}
							</Typography>
						</div>
					</div>
					{partner.owner && (
						<UserAvatar user={partner.owner} size={26} tooltip={`Responsável: ${partner.owner.name}`} />
					)}
				</div>
				<div className="grid grid-cols-4 gap-2">
					<Metric label="Indicações" value={stats.referrals} />
					<Metric label="Em aberto" value={stats.open} />
					<Metric label="Vendas" value={stats.won} highlight={stats.won > 0} />
					<Metric label="Receita/mês" value={formatCurrency(stats.wonValue)} highlight={stats.wonValue > 0} />
				</div>
				<Typography variant="caption" color="text.secondary" component="div">
					{stats.lastReferralAt
						? `Última indicação em ${formatShortDate(stats.lastReferralAt)}`
						: "Ainda sem indicações"}
				</Typography>
			</Paper>
		</ButtonBase>
	);
}

export function PartnersPage() {
	const { data, isLoading } = useGetPartnersQuery();
	const partners = data?.data ?? [];
	const totals = partners.reduce(
		(acc, p) => ({ referrals: acc.referrals + p.stats.referrals, won: acc.won + p.stats.won }),
		{ referrals: 0, won: 0 },
	);

	return (
		<PageSimple
			header={
				<PageHeader>
					<PageTitle
						title="Parceiros"
						icon={<Handshake strokeWidth={1.5} size={16} />}
						subInfo={`${partners.length} ${partners.length === 1 ? "parceiro" : "parceiros"} · ${totals.referrals} indicações · ${totals.won} vendas`}
					/>
					<PageActions>
						<Typography variant="caption" color="text.secondary" className="flex items-center gap-1">
							Como funciona
							<InfoTip title="Parceiros não compram: vendem o RE Patrimonial e indicam clientes. Ficam fora do pipeline e das vendas; o que conta são as indicações. Para cadastrar, abra o lead e use ⋯ › Marcar como parceiro." />
						</Typography>
					</PageActions>
				</PageHeader>
			}
			content={
				isLoading ? (
					<LoadingContent />
				) : partners.length === 0 ? (
					<EmptyState
						icon={<Handshake size={40} strokeWidth={1.5} />}
						title="Nenhum parceiro ainda"
						description="Abra o lead de quem vai vender por nós e use ⋯ › Marcar como parceiro. Ele sai do funil e passa a aparecer aqui com as indicações."
					/>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
						{partners.map((partner) => (
							<PartnerCard key={partner.id} partner={partner} />
						))}
					</div>
				)
			}
		/>
	);
}
