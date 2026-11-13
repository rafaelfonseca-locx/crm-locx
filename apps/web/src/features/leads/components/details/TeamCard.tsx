import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAskDialog } from "@/hooks/useAskDialog";
import { useNotify } from "@/hooks/useNotify";
import type { Lead, ParticipantRole } from "@/store/api/@types/lead.types";
import {
	useAddParticipantMutation,
	useGetUsersQuery,
	useRemoveParticipantMutation,
	useTransferLeadMutation,
} from "@/store/api/hooks";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { UserPlus, X } from "lucide-react";
import { useState } from "react";
import { PARTICIPANT_ROLE_LABELS } from "../../constants";
import { InfoCard } from "./InfoCards";

/** Responsável pelo lead + pessoas adicionadas ao processo (SDR, closer, técnico…). */
export function TeamCard({ lead }: { lead: Lead }) {
	const notify = useNotify();
	const { ask } = useAskDialog();
	const { data: users } = useGetUsersQuery();
	const [transferLead, { isLoading: isTransferring }] = useTransferLeadMutation();
	const [addParticipant, { isLoading: isAdding }] = useAddParticipantMutation();
	const [removeParticipant] = useRemoveParticipantMutation();
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [newUserId, setNewUserId] = useState("");
	const [newRole, setNewRole] = useState<ParticipantRole>("CLOSER");

	const takenIds = new Set([lead.ownerId, ...lead.participants.map((p) => p.userId)]);
	const available = (users?.data ?? []).filter((u) => !takenIds.has(u.id));

	const handleTransfer = async (ownerId: string) => {
		try {
			await transferLead({ id: lead.id, ownerId }).unwrap();
			notify.success("Responsável alterado com sucesso");
		} catch (error) {
			notify.apiError(error);
		}
	};

	const handleAdd = async () => {
		if (!newUserId) return;
		try {
			await addParticipant({ id: lead.id, userId: newUserId, role: newRole }).unwrap();
			notify.success("Pessoa adicionada ao processo");
			setIsAddOpen(false);
			setNewUserId("");
		} catch (error) {
			notify.apiError(error);
		}
	};

	const handleRemove = (userId: string, name: string) =>
		ask({
			title: "Remover do processo",
			subtitle: `“${name}” deixará de acompanhar este lead. O histórico de atividades é mantido.`,
			confirmText: "Remover",
			destructive: true,
			onConfirm: async () => {
				try {
					await removeParticipant({ id: lead.id, userId }).unwrap();
					notify.success("Pessoa removida do processo");
				} catch (error) {
					notify.apiError(error);
				}
			},
		});

	return (
		<InfoCard
			title="Equipe no processo"
			action={
				!isAddOpen && (
					<Button
						size="small"
						variant="text"
						color="inherit"
						startIcon={<UserPlus size={15} strokeWidth={1.5} />}
						onClick={() => setIsAddOpen(true)}
						data-cy="lead-add-participant"
					>
						Adicionar
					</Button>
				)
			}
		>
			<TextField
				select
				label="Responsável"
				value={lead.ownerId ?? ""}
				onChange={(e) => handleTransfer(e.target.value)}
				disabled={isTransferring}
				data-cy="lead-owner"
				slotProps={{
					select: {
						renderValue: () =>
							lead.owner ? (
								<span className="flex items-center gap-2">
									<UserAvatar user={lead.owner} size={20} tooltip={false} />
									{lead.owner.name}
								</span>
							) : (
								"Sem responsável"
							),
					},
				}}
			>
				{lead.ownerId === null && <MenuItem value="">Sem responsável</MenuItem>}
				{(users?.data ?? []).map((u) => (
					<MenuItem key={u.id} value={u.id}>
						{u.name}
					</MenuItem>
				))}
			</TextField>

			{lead.participants.length > 0 && (
				<ul className="space-y-1">
					{lead.participants.map((p) => (
						<li key={p.id} className="flex items-center gap-2.5 py-1">
							<UserAvatar user={p.user} size={28} tooltip={false} />
							<div className="flex-1 min-w-0">
								<Typography variant="body2" fontWeight={500} noWrap>
									{p.user.name}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									{PARTICIPANT_ROLE_LABELS[p.role]}
								</Typography>
							</div>
							<Tooltip title="Remover do processo">
								<IconButton
									size="small"
									onClick={() => handleRemove(p.userId, p.user.name)}
									aria-label={`Remover ${p.user.name}`}
								>
									<X size={16} strokeWidth={1.5} />
								</IconButton>
							</Tooltip>
						</li>
					))}
				</ul>
			)}

			{lead.participants.length === 0 && !isAddOpen && (
				<Typography variant="caption" color="text.secondary" component="p">
					Adicione SDR, closer ou apoio técnico para acompanharem o lead junto com o responsável.
				</Typography>
			)}

			{isAddOpen && (
				<div className="rounded-lg border p-3 space-y-2.5">
					<TextField
						select
						label="Pessoa*"
						value={newUserId}
						onChange={(e) => setNewUserId(e.target.value)}
						data-cy="participant-user"
					>
						{available.length === 0 && (
							<MenuItem value="" disabled>
								Todo o time já está no processo
							</MenuItem>
						)}
						{available.map((u) => (
							<MenuItem key={u.id} value={u.id}>
								{u.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						label="Papel"
						value={newRole}
						onChange={(e) => setNewRole(e.target.value as ParticipantRole)}
						data-cy="participant-role"
					>
						{Object.entries(PARTICIPANT_ROLE_LABELS).map(([value, label]) => (
							<MenuItem key={value} value={value}>
								{label}
							</MenuItem>
						))}
					</TextField>
					<div className="flex justify-end gap-2">
						<Button
							size="small"
							variant="outlined"
							color="inherit"
							onClick={() => setIsAddOpen(false)}
							disabled={isAdding}
						>
							Cancelar
						</Button>
						<Button
							size="small"
							onClick={handleAdd}
							loading={isAdding}
							disabled={!newUserId}
							data-cy="save-participant"
						>
							Adicionar
						</Button>
					</div>
				</div>
			)}
		</InfoCard>
	);
}
