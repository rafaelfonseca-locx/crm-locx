import { InfoTip } from "@/components/ui/InfoTip";
import { useNotify } from "@/hooks/useNotify";
import type { Lead } from "@/store/api/@types/lead.types";
import { formatCurrency, formatDateTime, whatsappLink } from "@/utils/formatters";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Copy, ExternalLink, Mail, MessageCircle, Pencil, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { BILLING_CYCLE_LABELS, CHANNEL_META, QUALIFICATION_LABELS, TEMPERATURE_META } from "../../constants";
import { ChannelIcon } from "../ChannelIcon";

export function InfoCard({
	title,
	children,
	action,
	info,
}: { title: string; children: ReactNode; action?: ReactNode; info?: string }) {
	return (
		<Paper className="rounded-xl p-4 space-y-3" sx={{ border: 1, borderColor: "divider" }}>
			<div className="flex items-center justify-between gap-2 min-h-7">
				<div className="flex items-center gap-1.5">
					<Typography variant="subtitle2" className="font-bold">
						{title}
					</Typography>
					{info && <InfoTip title={info} />}
				</div>
				{action}
			</div>
			{children}
		</Paper>
	);
}

/** Campo somente leitura: rótulo pequeno sobre valor. Mostra "N/A" quando vazio. */
export function DetailField({
	label,
	value,
	children,
	className,
	hint,
}: { label: string; value?: ReactNode; children?: ReactNode; className?: string; hint?: string }) {
	const content = children ?? value;
	return (
		<div className={className}>
			<Typography variant="caption" color="text.secondary" component="div" className="flex items-center gap-1">
				{label}
				{hint && <InfoTip title={hint} size={12} />}
			</Typography>
			<Typography variant="body2" fontWeight={500} component="div" className="break-words">
				{content === null || content === undefined || content === "" ? (
					<span className="opacity-50">N/A</span>
				) : (
					content
				)}
			</Typography>
		</div>
	);
}

function CopyButton({ value, label }: { value: string; label: string }) {
	const notify = useNotify();
	return (
		<Tooltip title={`Copiar ${label}`}>
			<IconButton
				size="small"
				aria-label={`Copiar ${label}`}
				onClick={async () => {
					try {
						await navigator.clipboard.writeText(value);
						notify.info(`${label[0].toUpperCase()}${label.slice(1)} copiado`);
					} catch {
						notify.info("Não foi possível copiar");
					}
				}}
			>
				<Copy size={14} strokeWidth={1.5} />
			</IconButton>
		</Tooltip>
	);
}

export function ContactCard({ lead, onEdit }: { lead: Lead; onEdit: () => void }) {
	return (
		<InfoCard
			title="Contato"
			action={
				<Tooltip title="Editar lead">
					<IconButton size="small" onClick={onEdit} aria-label="Editar lead" data-cy="lead-action-edit">
						<Pencil size={16} strokeWidth={1.5} />
					</IconButton>
				</Tooltip>
			}
		>
			<div className="space-y-2.5">
				<DetailField label="Nome" value={lead.name} />
				<DetailField label="Cargo" value={lead.jobTitle} />
				<DetailField label="E-mail">
					{lead.email && (
						<div className="flex items-center gap-1">
							<Link
								href={`mailto:${lead.email}`}
								underline="hover"
								className="truncate flex items-center gap-1"
								color="inherit"
							>
								<Mail size={14} strokeWidth={1.5} className="shrink-0" /> {lead.email}
							</Link>
							<CopyButton value={lead.email} label="e-mail" />
						</div>
					)}
				</DetailField>
				<DetailField label="Telefone">
					{lead.phone && (
						<div className="flex items-center gap-1 flex-wrap">
							<Link href={`tel:${lead.phone}`} underline="hover" color="inherit" className="flex items-center gap-1">
								<Phone size={14} strokeWidth={1.5} /> {lead.phone}
							</Link>
							<CopyButton value={lead.phone} label="telefone" />
							<Chip
								size="small"
								component="a"
								href={whatsappLink(lead.phone)}
								target="_blank"
								rel="noreferrer"
								clickable
								icon={<MessageCircle size={13} strokeWidth={1.5} />}
								label="WhatsApp"
								color="success"
								variant="outlined"
							/>
						</div>
					)}
				</DetailField>
			</div>
		</InfoCard>
	);
}

export function CompanyCard({ lead }: { lead: Lead }) {
	return (
		<InfoCard title="Empresa">
			<div className="grid grid-cols-2 gap-3">
				<DetailField className="col-span-2" label="Empresa" value={lead.companyName} />
				<DetailField label="Tamanho" value={lead.companySize} />
				<DetailField label="Segmento" value={lead.segment} />
				<DetailField label="Cidade" value={[lead.city, lead.state].filter(Boolean).join(" / ")} />
				<DetailField label="Site">
					{lead.website && (
						<Link
							href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
							target="_blank"
							rel="noreferrer"
							underline="hover"
						>
							{lead.website.replace(/^https?:\/\//, "")}
						</Link>
					)}
				</DetailField>
			</div>
		</InfoCard>
	);
}

export function OpportunityCard({ lead }: { lead: Lead }) {
	return (
		<InfoCard title="Oportunidade" info="Valores mensais. No plano anual, é o valor por mês com o desconto de 20%.">
			<div className="grid grid-cols-2 gap-3">
				<DetailField label={lead.status === "WON" ? "Valor mensal fechado" : "Valor mensal estimado"}>
					{lead.estimatedValue !== null && <span className="tabular-nums">{formatCurrency(lead.estimatedValue)}</span>}
				</DetailField>
				<DetailField
					label="Plano"
					value={
						lead.plan
							? `${lead.plan}${lead.billingCycle ? ` · ${BILLING_CYCLE_LABELS[lead.billingCycle].toLowerCase()}` : ""}`
							: null
					}
				/>
				<DetailField
					label="Temperatura"
					hint="Quente: quer começar em até 30 dias. Morno: em até 3 meses. Frio: sem prazo ou só pesquisando."
				>
					{lead.temperature && (
						<Chip
							size="small"
							variant="outlined"
							color={TEMPERATURE_META[lead.temperature].color}
							label={TEMPERATURE_META[lead.temperature].label}
						/>
					)}
				</DetailField>
				<DetailField label="Criado em" value={formatDateTime(lead.createdAt)} />
				{lead.lostReason && <DetailField className="col-span-2" label="Motivo da perda" value={lead.lostReason} />}
				{lead.tags.length > 0 && (
					<DetailField className="col-span-2" label="Tags">
						<div className="flex flex-wrap gap-1 pt-0.5">
							{lead.tags.map((t) => (
								<Chip key={t} size="small" label={t} />
							))}
						</div>
					</DetailField>
				)}
				{lead.notes && (
					<DetailField className="col-span-2" label="Observações">
						<Box component="p" className="whitespace-pre-wrap font-normal">
							{lead.notes}
						</Box>
					</DetailField>
				)}
			</div>
		</InfoCard>
	);
}

export function OriginCard({ lead }: { lead: Lead }) {
	const fromRd = lead.source === "RD Station";
	return (
		<InfoCard
			title="Origem"
			info="De onde o lead veio. Os dados de campanha (UTM) chegam do RD Station."
			action={
				fromRd && lead.rdPublicUrl ? (
					<Link
						href={lead.rdPublicUrl}
						target="_blank"
						rel="noreferrer"
						variant="caption"
						className="flex items-center gap-1"
						underline="hover"
					>
						Ver no RD <ExternalLink size={12} strokeWidth={1.5} />
					</Link>
				) : undefined
			}
		>
			<div className="grid grid-cols-2 gap-3">
				<DetailField label="Canal de entrada" hint={CHANNEL_META[lead.channel].description}>
					<span className="inline-flex items-center gap-1.5">
						<ChannelIcon channel={lead.channel} />
						{CHANNEL_META[lead.channel].short}
					</span>
				</DetailField>
				<DetailField label="Origem" value={lead.source} />
				<DetailField label="Conversões" value={fromRd ? lead.conversionCount : null} />
				<DetailField className="col-span-2" label="Conversão" value={lead.conversionIdentifier} />
				<DetailField label="UTM source" value={lead.utmSource} />
				<DetailField label="UTM medium" value={lead.utmMedium} />
				<DetailField className="col-span-2" label="UTM campaign" value={lead.utmCampaign} />
			</div>
		</InfoCard>
	);
}

/** Respostas das perguntas padronizadas dos formulários. */
export function QualificationCard({ lead, onEdit }: { lead: Lead; onEdit: () => void }) {
	const fields = ["businessType", "contractsRange", "managementRole", "currentTool", "startTimeline"] as const;
	const answered = fields.filter((f) => lead[f]).length;
	return (
		<InfoCard
			title="Qualificação"
			info="Respostas do formulário do site, do WhatsApp ou do agendamento. Complete no pré-atendimento o que faltar."
			action={
				<Typography
					variant="caption"
					color={answered === fields.length ? "success.main" : "text.secondary"}
					fontWeight={600}
				>
					{answered}/{fields.length}
				</Typography>
			}
		>
			<div className="grid grid-cols-2 gap-3">
				{fields.map((field) => (
					<DetailField
						key={field}
						label={QUALIFICATION_LABELS[field]}
						value={lead[field]}
						className={field === "startTimeline" ? "col-span-2" : undefined}
					/>
				))}
				<DetailField label="Estado" value={lead.state} />
				<DetailField label="Cidade" value={lead.city} />
			</div>
			{answered < fields.length && (
				<Typography
					component="button"
					type="button"
					variant="caption"
					onClick={onEdit}
					className="font-semibold hover:underline"
					sx={{ color: "info.main" }}
				>
					Completar qualificação
				</Typography>
			)}
		</InfoCard>
	);
}
