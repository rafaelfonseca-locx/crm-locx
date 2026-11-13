import { LoadingContent } from "@/components/feedback/LoadingContent";
import { RHFSelect, RHFTextField } from "@/components/form/fields";
import { GridForm } from "@/components/layout/Form";
import { PageActions, PageHeader, PageSimple, PageTitle } from "@/components/layout/Page";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ROLE_LABELS } from "@/features/leads/constants";
import { useAuth } from "@/hooks/useAuth";
import { useNotify } from "@/hooks/useNotify";
import type { TeamMember } from "@/store/api/@types/user.types";
import { useCreateUserMutation, useGetUsersQuery, useUpdateUserMutation } from "@/store/api/hooks";
import { timeAgo } from "@/utils/formatters";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Pencil, Plus, Shuffle, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod/v3";

const COLORS = ["#0288D1", "#2E7D32", "#7B1FA2", "#EF6C00", "#C2185B", "#00838F", "#5D4037", "#455A64"];

const userSchema = (isEditing: boolean) =>
	z.object({
		name: z.string().trim().min(1, "Nome é obrigatório").max(80),
		email: z.string().trim().min(1, "E-mail é obrigatório").email("E-mail inválido"),
		password: isEditing
			? z.string().min(8, "A senha deve ter pelo menos 8 caracteres").or(z.literal("")).optional()
			: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
		role: z.enum(["ADMIN", "MANAGER", "SALES"]),
		color: z.string(),
		receivesLeads: z.boolean(),
	});
type UserForm = z.infer<ReturnType<typeof userSchema>>;

function UserDialog({ open, member, onClose }: { open: boolean; member: TeamMember | null; onClose: () => void }) {
	const notify = useNotify();
	const { isAdmin } = useAuth();
	const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
	const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
	const isSaving = isCreating || isUpdating;
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<UserForm>({ resolver: zodResolver(userSchema(!!member)) });

	useEffect(() => {
		if (open) {
			reset({
				name: member?.name ?? "",
				email: member?.email ?? "",
				password: "",
				role: member?.role ?? "SALES",
				color: member?.color ?? COLORS[0],
				receivesLeads: member?.receivesLeads ?? true,
			});
		}
	}, [open, member, reset]);

	const handleSave = async ({ password, ...values }: UserForm) => {
		try {
			if (member) await updateUser({ id: member.id, ...values, ...(password ? { password } : {}) }).unwrap();
			else await createUser({ ...values, password }).unwrap();
			notify.success(member ? "Pessoa atualizada com sucesso" : "Pessoa cadastrada com sucesso");
			onClose();
		} catch (error) {
			notify.apiError(error);
		}
	};

	return (
		<Dialog open={open} onClose={isSaving ? undefined : onClose} maxWidth="sm" data-cy="user-form-dialog">
			<DialogTitle onClose={onClose}>{member ? "Editar pessoa" : "Adicionar pessoa"}</DialogTitle>
			<DialogContent>
				<form id="user-form" onSubmit={handleSubmit(handleSave)} noValidate>
					<GridForm>
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="name"
							label="Nome*"
							disabled={isSaving}
							error={!!errors.name}
							helperText={errors.name?.message}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="email"
							label="E-mail*"
							type="email"
							disabled={isSaving}
							error={!!errors.email}
							helperText={errors.email?.message}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="password"
							label={member ? "Nova senha" : "Senha inicial*"}
							type="password"
							autoComplete="new-password"
							disabled={isSaving}
							error={!!errors.password}
							helperText={
								errors.password?.message ?? (member ? "Deixe em branco para manter a atual" : "Mínimo de 8 caracteres")
							}
						/>
						<RHFSelect
							className="col-span-12 md:col-span-6"
							control={control}
							name="role"
							label="Perfil*"
							emptyLabel={false}
							options={Object.entries(ROLE_LABELS)
								.filter(([value]) => isAdmin || value !== "ADMIN")
								.map(([value, label]) => ({ value, label }))}
							disabled={isSaving}
						/>
						<div className="col-span-12 space-y-1.5">
							<Typography variant="caption" color="text.secondary">
								Cor do avatar
							</Typography>
							<Controller
								control={control}
								name="color"
								render={({ field }) => (
									<div className="flex gap-2" role="radiogroup" aria-label="Cor do avatar">
										{COLORS.map((c) => (
											<Box
												key={c}
												component="button"
												type="button"
												role="radio"
												aria-checked={field.value === c}
												aria-label={c}
												onClick={() => field.onChange(c)}
												className="w-7 h-7 rounded-full"
												sx={{
													bgcolor: c,
													outline: field.value === c ? "2px solid" : "none",
													outlineColor: "text.primary",
													outlineOffset: 2,
												}}
											/>
										))}
									</div>
								)}
							/>
						</div>
						<Controller
							control={control}
							name="receivesLeads"
							render={({ field }) => (
								// biome-ignore lint/a11y/noLabelWithoutControl: o Switch dentro do label é o controle
								<label className="col-span-12 flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
									<div>
										<Typography variant="body2" fontWeight={600}>
											Recebe leads do RD Station
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Participa do rodízio de distribuição automática
										</Typography>
									</div>
									<Switch
										checked={!!field.value}
										onChange={(e) => field.onChange(e.target.checked)}
										disabled={isSaving}
									/>
								</label>
							)}
						/>
					</GridForm>
				</form>
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" color="inherit" onClick={onClose} disabled={isSaving}>
					Cancelar
				</Button>
				<Button type="submit" form="user-form" loading={isSaving} data-cy="save-user">
					Salvar
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export function TeamPage() {
	const { user, isManager } = useAuth();
	const notify = useNotify();
	const { data, isLoading } = useGetUsersQuery({ includeInactive: true });
	const [updateUser] = useUpdateUserMutation();
	const [dialog, setDialog] = useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null });

	const handleToggle = async (member: TeamMember, field: "receivesLeads" | "active", value: boolean) => {
		try {
			await updateUser({ id: member.id, [field]: value }).unwrap();
			notify.success(
				field === "active"
					? value
						? "Pessoa reativada"
						: "Pessoa desativada"
					: value
						? "Incluída no rodízio"
						: "Removida do rodízio",
			);
		} catch (error) {
			notify.apiError(error);
		}
	};

	const members = data?.data ?? [];
	const inRotation = members.filter((m) => m.active && m.receivesLeads);

	return (
		<>
			<UserDialog open={dialog.open} member={dialog.member} onClose={() => setDialog({ open: false, member: null })} />
			<PageSimple
				header={
					<PageHeader>
						<PageTitle
							title="Equipe"
							icon={<Users strokeWidth={1.5} size={16} />}
							subInfo={`${members.filter((m) => m.active).length} pessoas ativas · ${inRotation.length} no rodízio de leads`}
						/>
						<PageActions>
							{isManager && (
								<Button
									startIcon={<Plus size={16} strokeWidth={2} />}
									onClick={() => setDialog({ open: true, member: null })}
									data-cy="button-register-users"
								>
									Adicionar pessoa
								</Button>
							)}
						</PageActions>
					</PageHeader>
				}
				content={
					isLoading ? (
						<LoadingContent />
					) : (
						<div className="space-y-4">
							{!isManager && (
								<Alert severity="info">Somente gestores podem adicionar pessoas ou alterar o rodízio de leads.</Alert>
							)}
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{members.map((member) => (
									<Paper
										key={member.id}
										className="rounded-xl p-4 space-y-4"
										sx={{ border: 1, borderColor: "divider", opacity: member.active ? 1 : 0.6 }}
										data-cy={`team-card-${member.id}`}
									>
										<div className="flex items-start gap-3">
											<UserAvatar user={member} size={44} tooltip={false} />
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<Typography variant="body2" fontWeight={700} noWrap>
														{member.name}
													</Typography>
													{member.id === user?.id && (
														<Chip size="small" label="Você" sx={{ height: 20, fontSize: 11 }} />
													)}
												</div>
												<Typography variant="caption" color="text.secondary" component="div" noWrap>
													{member.email}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													{ROLE_LABELS[member.role]}
													{!member.active && " · Inativo"}
												</Typography>
											</div>
											{isManager && (
												<Tooltip title="Editar">
													<IconButton
														size="small"
														onClick={() => setDialog({ open: true, member })}
														aria-label={`Editar ${member.name}`}
													>
														<Pencil size={16} strokeWidth={1.5} />
													</IconButton>
												</Tooltip>
											)}
										</div>
										<div className="grid grid-cols-3 gap-2 text-center">
											{[
												["Em aberto", member.stats.openLeads],
												["Trials", member.stats.activeTrials],
												["Vendas", member.stats.won],
											].map(([label, value]) => (
												<Box key={label} className="rounded-lg py-2" sx={{ bgcolor: "action.hover" }}>
													<Typography className="text-lg font-bold tabular-nums leading-tight">{value}</Typography>
													<Typography variant="caption" color="text.secondary">
														{label}
													</Typography>
												</Box>
											))}
										</div>
										<div className="flex items-center justify-between gap-2 border-t pt-3">
											<div className="flex items-center gap-2 min-w-0">
												<Shuffle size={15} strokeWidth={1.5} className="opacity-60 shrink-0" />
												<div className="min-w-0">
													<Typography variant="body2" fontWeight={500}>
														Rodízio de leads
													</Typography>
													<Typography variant="caption" color="text.secondary" noWrap component="div">
														{member.lastAssignedAt
															? `Último lead ${timeAgo(member.lastAssignedAt)}`
															: "Ainda não recebeu leads"}
													</Typography>
												</div>
											</div>
											<Switch
												checked={member.receivesLeads}
												disabled={!isManager || !member.active}
												onChange={(e) => handleToggle(member, "receivesLeads", e.target.checked)}
												slotProps={{ input: { "aria-label": `Rodízio de leads para ${member.name}` } }}
											/>
										</div>
										{isManager && member.id !== user?.id && (
											<Button
												size="small"
												variant="text"
												color="inherit"
												onClick={() => handleToggle(member, "active", !member.active)}
												className="!-mt-1"
											>
												{member.active ? "Desativar acesso" : "Reativar acesso"}
											</Button>
										)}
									</Paper>
								))}
							</div>
						</div>
					)
				}
			/>
		</>
	);
}
