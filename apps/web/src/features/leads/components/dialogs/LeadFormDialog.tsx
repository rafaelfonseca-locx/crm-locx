import { RHFSelect, RHFTextField } from "@/components/form/fields";
import { SectionForm } from "@/components/layout/Form";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotify } from "@/hooks/useNotify";
import type { Lead } from "@/store/api/@types/lead.types";
import { useCreateLeadMutation, useGetUsersQuery, useUpdateLeadMutation } from "@/store/api/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v3";
import { COMPANY_SIZES, LEAD_SOURCES, PLANS, STAGE_META, STAGE_ORDER, TEMPERATURE_META } from "../../constants";

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
	companySize: optional,
	segment: optional,
	website: optional,
	city: optional,
	state: z.string().trim().max(2, "Use a sigla da UF").nullish(),
	temperature: z.enum(["COLD", "WARM", "HOT"]).nullish(),
	estimatedValue: z.number({ invalid_type_error: "Valor inválido" }).min(0, "O valor deve ser positivo").nullish(),
	plan: optional,
	source: z.string().min(1, "Origem é obrigatória"),
	ownerId: z.string().nullish(),
	stage: z.enum(["NEW", "QUALIFICATION", "MEETING", "TRIAL", "CLOSING"]),
	notes: optional,
});

/** Campos de texto vazios viram null; UF em maiúsculas. */
function toPayload(values: LeadValidationSchema) {
	const entries = Object.entries(values).map(([key, value]) => [
		key,
		typeof value === "string" && value.trim() === "" ? null : value,
	]);
	const payload = Object.fromEntries(entries) as LeadValidationSchema;
	return { ...payload, state: payload.state ? payload.state.toUpperCase() : null, source: values.source };
}

export type LeadValidationSchema = z.infer<typeof leadValidationSchema>;

type LeadFormDialogProps = { open: boolean; lead?: Lead | null; onClose: () => void; onSaved?: (lead: Lead) => void };

export function LeadFormDialog({ open, lead, onClose, onSaved }: LeadFormDialogProps) {
	const isEditing = !!lead;
	const { user } = useAuth();
	const notify = useNotify();
	const { data: users } = useGetUsersQuery();
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
			companySize: lead?.companySize ?? null,
			segment: lead?.segment ?? null,
			website: lead?.website ?? null,
			city: lead?.city ?? null,
			state: lead?.state ?? null,
			temperature: lead?.temperature ?? null,
			estimatedValue: lead?.estimatedValue ?? null,
			plan: lead?.plan ?? null,
			source: lead?.source ?? "Manual",
			ownerId: lead ? lead.ownerId : (user?.id ?? null),
			stage: lead?.stage ?? "NEW",
			notes: lead?.notes ?? null,
		}),
		[lead, user?.id],
	);

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<LeadValidationSchema>({ resolver: zodResolver(leadValidationSchema), defaultValues });

	useEffect(() => {
		if (open) reset(defaultValues);
	}, [open, defaultValues, reset]);

	const userOptions = (users?.data ?? []).map((u) => ({ label: u.name, value: u.id }));
	const sourceOptions = [...new Set([...LEAD_SOURCES, lead?.source ?? "Manual"])].map((s) => ({ label: s, value: s }));

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

	return (
		<Dialog open={open} onClose={isSaving ? undefined : onClose} maxWidth="md" data-cy="lead-form-dialog">
			<DialogTitle
				onClose={onClose}
				subtitle={isEditing ? `#${lead?.id}` : "Leads do RD Station entram automaticamente"}
			>
				{isEditing ? "Editar lead" : "Novo lead"}
			</DialogTitle>
			<DialogContent>
				<form id={FORM_ID} onSubmit={handleSubmit(handleSave)} className="space-y-5" noValidate>
					<SectionForm title="Contato">
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="name"
							label="Nome*"
							autoFocus
							disabled={isSaving}
							error={!!errors.name}
							helperText={errors.name?.message}
							slotProps={{ htmlInput: { maxLength: LEAD_NAME_MAX_LENGTH } }}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="jobTitle"
							label="Cargo"
							disabled={isSaving}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="email"
							label="E-mail"
							type="email"
							disabled={isSaving}
							error={!!errors.email}
							helperText={errors.email?.message}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="phone"
							label="Telefone / WhatsApp"
							disabled={isSaving}
						/>
					</SectionForm>
					<SectionForm title="Empresa">
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="companyName"
							label="Empresa"
							disabled={isSaving}
						/>
						<RHFSelect
							className="col-span-12 md:col-span-6"
							control={control}
							name="companySize"
							label="Tamanho"
							options={COMPANY_SIZES.map((s) => ({ label: s, value: s }))}
							disabled={isSaving}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-4"
							control={control}
							name="segment"
							label="Segmento"
							disabled={isSaving}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-4"
							control={control}
							name="website"
							label="Site"
							disabled={isSaving}
						/>
						<RHFTextField
							className="col-span-8 md:col-span-3"
							control={control}
							name="city"
							label="Cidade"
							disabled={isSaving}
						/>
						<RHFTextField
							className="col-span-4 md:col-span-1"
							control={control}
							name="state"
							label="UF"
							disabled={isSaving}
							error={!!errors.state}
							slotProps={{ htmlInput: { maxLength: 2 } }}
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
							name="source"
							label="Origem*"
							emptyLabel={false}
							options={sourceOptions}
							disabled={isSaving || lead?.source === "RD Station"}
						/>
						<RHFSelect
							className="col-span-12 md:col-span-4"
							control={control}
							name="temperature"
							label="Temperatura"
							options={Object.entries(TEMPERATURE_META).map(([value, m]) => ({ label: m.label, value }))}
							disabled={isSaving}
						/>
						<RHFTextField
							className="col-span-12 md:col-span-4"
							control={control}
							name="estimatedValue"
							label="Valor mensal estimado"
							type="number"
							disabled={isSaving}
							error={!!errors.estimatedValue}
							helperText={errors.estimatedValue?.message}
							slotProps={{
								input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> },
								htmlInput: { min: 0, step: 10 },
							}}
						/>
						<RHFSelect
							className="col-span-12 md:col-span-4"
							control={control}
							name="plan"
							label="Plano de interesse"
							options={PLANS.map((p) => ({ label: p, value: p }))}
							disabled={isSaving}
						/>
						<RHFTextField
							className="col-span-12"
							control={control}
							name="notes"
							label="Observações"
							multiline
							minRows={3}
							disabled={isSaving}
						/>
					</SectionForm>
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
