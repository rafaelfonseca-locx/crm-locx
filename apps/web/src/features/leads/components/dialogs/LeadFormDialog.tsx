import { RHFSelect, RHFTextField } from "@/components/form/fields";
import { SectionForm } from "@/components/layout/Form";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotify } from "@/hooks/useNotify";
import type { Lead, LeadStage } from "@/store/api/@types/lead.types";
import { useCreateLeadMutation, useGetPartnersQuery, useGetUsersQuery, useUpdateLeadMutation } from "@/store/api/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod/v3";
import {
	BILLING_CYCLE_LABELS,
	BRAZIL_STATES,
	CHANNEL_META,
	LEAD_SOURCES,
	PLANS,
	QUALIFICATION_LABELS,
	QUALIFICATION_OPTIONS,
	STAGE_META,
	STAGE_ORDER,
	TEMPERATURE_META,
	planPrice,
} from "../../constants";

const FORM_ID = "lead-form";
export const LEAD_NAME_MAX_LENGTH = 120;

const optional = z.string().trim().nullish();

export const leadValidationSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Nome é obrigatório")
		.max(LEAD_NAME_MAX_LENGTH, `O nome deve conter no máximo ${LEAD_NAME_MAX_LENGTH} caracteres`),
	email: z.string().trim().email("E-mail inválido").nullish().or(z.literal("")),
	phone: optional,
	jobTitle: optional,
	companyName: optional,
	website: optional,
	city: optional,
	state: optional,
	businessType: optional,
	managementRole: optional,
	contractsRange: optional,
	currentTool: optional,
	startTimeline: optional,
	temperature: z.enum(["COLD", "WARM", "HOT"]).nullish(),
	estimatedValue: z.number({ invalid_type_error: "Valor inválido" }).min(0, "O valor deve ser positivo").nullish(),
	plan: optional,
	billingCycle: z.enum(["MONTHLY", "ANNUAL"]).nullish(),
	channel: z.enum(["DEMO", "WHATSAPP", "SITE", "MANUAL"]),
	source: z.string().min(1, "Origem é obrigatória"),
	ownerId: z.string().nullish(),
	// Id do parceiro (texto no formulário, número na API)
	referredById: z.string().nullish(),
	stage: z.enum(["NEW", "QUALIFICATION", "MEETING", "TRIAL", "CLOSING"]),
	notes: optional,
});

export type LeadValidationSchema = z.infer<typeof leadValidationSchema>;

/** Campos de texto vazios viram null. */
function toPayload(values: LeadValidationSchema) {
	const entries = Object.entries(values).map(([key, value]) => [
		key,
		typeof value === "string" && value.trim() === "" ? null : value,
	]);
	const payload = Object.fromEntries(entries) as LeadValidationSchema;
	return {
		...payload,
		source: values.source,
		referredById: payload.referredById ? Number(payload.referredById) : null,
	};
}

const isFromIntegrationSource = (source: string | null | undefined) => source === "RD Station" || source === "Cal.com";

const options = (values: readonly string[], current?: string | null) =>
	[...new Set([...values, ...(current ? [current] : [])])].map((v) => ({ label: v, value: v }));

type LeadFormDialogProps = {
	open: boolean;
	lead?: Lead | null;
	defaultStage?: LeadStage;
	defaultReferredById?: number;
	onClose: () => void;
	onSaved?: (lead: Lead) => void;
};

export function LeadFormDialog({
	open,
	lead,
	defaultStage,
	defaultReferredById,
	onClose,
	onSaved,
}: LeadFormDialogProps) {
	const isEditing = !!lead;
	const { user } = useAuth();
	const notify = useNotify();
	const { data: users } = useGetUsersQuery();
	const { data: partners } = useGetPartnersQuery(undefined, { skip: !open });
	const isPartner = lead?.kind === "PARTNER";
	const [createLead, { isLoading: isCreating }] = useCreateLeadMutation();
	const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();
	const isSaving = isCreating || isUpdating;

	const defaultValues = useMemo<LeadValidationSchema>(
		() => ({
			name: lead?.name ?? "",
			email: lead?.email ?? null,
			phone: lead?.phone ?? null,
			jobTitle: lead?.jobTitle ?? null,
			companyName: lead?.companyName ?? null,
			website: lead?.website ?? null,
			city: lead?.city ?? null,
			state: lead?.state ?? null,
			businessType: lead?.businessType ?? null,
			managementRole: lead?.managementRole ?? null,
			contractsRange: lead?.contractsRange ?? null,
			currentTool: lead?.currentTool ?? null,
			startTimeline: lead?.startTimeline ?? null,
			temperature: lead?.temperature ?? null,
			estimatedValue: lead?.estimatedValue ?? null,
			plan: lead?.plan ?? null,
			billingCycle: lead?.billingCycle ?? "MONTHLY",
			channel: lead?.channel ?? "MANUAL",
			source: lead?.source ?? (defaultReferredById ? "Parceiro" : "Manual"),
			referredById: lead?.referredById
				? String(lead.referredById)
				: defaultReferredById
					? String(defaultReferredById)
					: null,
			ownerId: lead ? lead.ownerId : (user?.id ?? null),
			stage: lead?.stage ?? defaultStage ?? "NEW",
			notes: lead?.notes ?? null,
		}),
		[lead, user?.id, defaultStage, defaultReferredById],
	);

	const {
		control,
		handleSubmit,
		reset,
		setValue,
		getValues,
		formState: { errors },
	} = useForm<LeadValidationSchema>({ resolver: zodResolver(leadValidationSchema), defaultValues });

	useEffect(() => {
		if (open) reset(defaultValues);
	}, [open, defaultValues, reset]);

	// Escolher plano e ciclo preenche o valor mensal pela tabela de preços (dá para ajustar depois)
	const [plan, billingCycle] = useWatch({ control, name: ["plan", "billingCycle"] });
	useEffect(() => {
		const price = planPrice(plan, billingCycle);
		if (price !== null && price !== getValues("estimatedValue")) setValue("estimatedValue", price);
	}, [plan, billingCycle, setValue, getValues]);

	const userOptions = (users?.data ?? []).map((u) => ({ label: u.name, value: u.id }));
	const partnerOptions = (partners?.data ?? [])
		.filter((p) => p.id !== lead?.id)
		.map((p) => ({ label: p.companyName ? `${p.companyName} · ${p.name}` : p.name, value: String(p.id) }));

	// Indicação de parceiro: a origem passa a ser "Parceiro"
	const referredById = useWatch({ control, name: "referredById" });
	useEffect(() => {
		if (referredById && !isFromIntegrationSource(getValues("source"))) setValue("source", "Parceiro");
	}, [referredById, setValue, getValues]);
	const isFromIntegration = lead?.source === "RD Station" || lead?.source === "Cal.com";

	const handleSave = async (values: LeadValidationSchema) => {
		try {
			if (isEditing && lead) {
				const { stage: _stage, ...rest } = toPayload(values);
				const result = await updateLead({ id: lead.id, ...rest }).unwrap();
				notify.success("Lead atualizado com sucesso");
				onSaved?.(result.data);
			} else {
				const result = await createLead(toPayload(values)).unwrap();
				notify.success("Lead cadastrado com sucesso");
				onSaved?.(result.data);
			}
			onClose();
		} catch (error) {
			notify.apiError(error);
		}
	};

	const qualificationField = (name: keyof typeof QUALIFICATION_OPTIONS, className = "col-span-12 md:col-span-6") => (
		<RHFSelect
			className={className}
			control={control}
			name={name}
			label={QUALIFICATION_LABELS[name]}
			options={options(QUALIFICATION_OPTIONS[name], lead?.[name])}
			disabled={isSaving}
		/>
	);

	return (
		<Dialog open={open} onClose={isSaving ? undefined : onClose} maxWidth="md" data-cy="lead-form-dialog">
			<DialogTitle
				onClose={onClose}
				subtitle={
					isEditing
						? `#${lead?.id}`
						: "Leads do RD Station e do Cal.com entram sozinhos. Use para indicações, eventos e prospecção."
				}
			>
				{isEditing ? "Editar lead" : "Novo lead"}
			</DialogTitle>
			<DialogContent>
				<form id={FORM_ID} onSubmit={handleSubmit(handleSave)} className="space-y-6" noValidate>
					<SectionForm title="Contato">
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="name"
							label="Nome completo*"
							autoFocus
							disabled={isSaving}
							error={!!errors.name}
							helperText={errors.name?.message}
							slotProps={{ htmlInput: { maxLength: LEAD_NAME_MAX_LENGTH } }}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="companyName"
							label="Empresa"
							disabled={isSaving}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="email"
							label="E-mail corporativo"
							type="email"
							disabled={isSaving}
							error={!!errors.email}
							helperText={errors.email?.message}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="phone"
							label="WhatsApp"
							disabled={isSaving}
						/>
					</SectionForm>

					<SectionForm
						title="Qualificação"
						infoText="As mesmas perguntas dos formulários do site, do WhatsApp e do agendamento."
					>
						{qualificationField("businessType")}
						{qualificationField("contractsRange")}
						{qualificationField("managementRole")}
						{qualificationField("currentTool")}
						{qualificationField("startTimeline")}
						<RHFSelect
							className="col-span-6 md:col-span-3"
							control={control}
							name="state"
							label="Estado"
							options={BRAZIL_STATES.map((s) => ({ label: s, value: s }))}
							disabled={isSaving}
						/>
						<RHFTextField
							className="col-span-6 md:col-span-3"
							control={control}
							name="city"
							label="Cidade"
							disabled={isSaving}
						/>
					</SectionForm>

					<SectionForm title="Oportunidade">
						<RHFSelect
							className="col-span-12 md:col-span-4"
							control={control}
							name="ownerId"
							label="Responsável"
							emptyLabel="Sem responsável"
							options={userOptions}
							disabled={isSaving}
						/>
						{!isEditing && (
							<RHFSelect
								className="col-span-12 md:col-span-4"
								control={control}
								name="stage"
								label="Etapa*"
								emptyLabel={false}
								options={STAGE_ORDER.filter((s) => s !== "TRIAL").map((s) => ({
									label: STAGE_META[s].label,
									value: s,
								}))}
								disabled={isSaving}
							/>
						)}
						<RHFSelect
							className="col-span-12 md:col-span-4"
							control={control}
							name="temperature"
							label="Temperatura"
							options={Object.entries(TEMPERATURE_META).map(([value, m]) => ({
								label: `${m.label} · ${m.hint.toLowerCase()}`,
								value,
							}))}
							disabled={isSaving}
						/>
						<RHFSelect
							className="col-span-12 md:col-span-4"
							control={control}
							name="plan"
							label="Plano de interesse"
							options={PLANS.map((p) => ({ label: p.name, value: p.name }))}
							disabled={isSaving}
						/>
						<div className="col-span-12 md:col-span-4">
							<Controller
								control={control}
								name="billingCycle"
								render={({ field }) => (
									<ToggleButtonGroup
										exclusive
										fullWidth
										value={field.value ?? "MONTHLY"}
										onChange={(_, v) => v && field.onChange(v)}
										sx={{ "& .MuiToggleButton-root": { height: 40 } }}
										aria-label="Ciclo de cobrança"
										disabled={isSaving}
									>
										{(["MONTHLY", "ANNUAL"] as const).map((c) => (
											<ToggleButton key={c} value={c}>
												{BILLING_CYCLE_LABELS[c]}
											</ToggleButton>
										))}
									</ToggleButtonGroup>
								)}
							/>
						</div>
						<RHFTextField
							className="col-span-12 md:col-span-4"
							control={control}
							name="estimatedValue"
							label="Valor mensal"
							type="number"
							disabled={isSaving}
							error={!!errors.estimatedValue}
							helperText={
								errors.estimatedValue?.message ?? (plan === "Enterprise" ? "Enterprise: valor sob consulta" : " ")
							}
							slotProps={{
								input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> },
								htmlInput: { min: 0, step: 10 },
							}}
						/>
						<RHFSelect
							className="col-span-12 md:col-span-6"
							control={control}
							name="channel"
							label="Canal de entrada*"
							emptyLabel={false}
							options={Object.entries(CHANNEL_META).map(([value, m]) => ({ label: m.label, value }))}
							disabled={isSaving || isFromIntegration}
						/>
						<RHFSelect
							className="col-span-12 md:col-span-6"
							control={control}
							name="source"
							label="Origem*"
							emptyLabel={false}
							options={options(LEAD_SOURCES, lead?.source)}
							disabled={isSaving || isFromIntegration}
						/>
						{!isPartner && (
							<RHFSelect
								className="col-span-12"
								control={control}
								name="referredById"
								label="Indicado por (parceiro)"
								emptyLabel="Ninguém (não veio de parceiro)"
								options={partnerOptions}
								disabled={isSaving}
								helperText={
									partnerOptions.length === 0
										? "Nenhum parceiro cadastrado. Marque um lead como parceiro no menu do lead."
										: "Parceiros vendem por nós: a venda conta para o parceiro que indicou."
								}
							/>
						)}
						<RHFTextField
							className="col-span-12"
							control={control}
							name="notes"
							label="Observações"
							multiline
							minRows={2}
							disabled={isSaving}
						/>
					</SectionForm>
					{isFromIntegration && (
						<Typography variant="caption" color="text.secondary" component="p">
							Canal e origem vêm da integração e não podem ser alterados.
						</Typography>
					)}
				</form>
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" color="inherit" onClick={onClose} disabled={isSaving}>
					Cancelar
				</Button>
				<Button type="submit" form={FORM_ID} loading={isSaving} data-cy="save-lead">
					{isEditing ? "Salvar" : "Cadastrar lead"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
