import { RHFSelect, RHFTextField } from "@/components/form/fields";
import { GridForm } from "@/components/layout/Form";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { useNotify } from "@/hooks/useNotify";
import type { Lead } from "@/store/api/@types/lead.types";
import { useLoseLeadMutation, useWinLeadMutation } from "@/store/api/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod/v3";
import { BILLING_CYCLE_LABELS, LOST_REASONS, PLANS, planPrice } from "../../constants";

type Props = { open: boolean; lead: Lead | null; onClose: () => void };

const winSchema = z.object({
	estimatedValue: z
		.number({ invalid_type_error: "Valor é obrigatório", required_error: "Valor é obrigatório" })
		.min(0, "O valor deve ser positivo"),
	plan: z.string().nullish(),
	billingCycle: z.enum(["MONTHLY", "ANNUAL"]).nullish(),
	note: z.string().trim().max(2000).nullish(),
});
type WinSchema = z.infer<typeof winSchema>;

export function WinLeadDialog({ open, lead, onClose }: Props) {
	const notify = useNotify();
	const [winLead, { isLoading }] = useWinLeadMutation();
	const {
		control,
		handleSubmit,
		reset,
		setValue,
		formState: { errors },
	} = useForm<WinSchema>({ resolver: zodResolver(winSchema) });
	const [plan, billingCycle] = useWatch({ control, name: ["plan", "billingCycle"] });

	// O valor segue a tabela de preços do plano escolhido (dá para ajustar em caso de desconto)
	useEffect(() => {
		const price = planPrice(plan, billingCycle);
		if (open && price !== null) setValue("estimatedValue", price);
	}, [plan, billingCycle, open, setValue]);

	useEffect(() => {
		if (open && lead)
			reset({
				estimatedValue: lead.estimatedValue ?? (undefined as unknown as number),
				plan: lead.plan,
				billingCycle: lead.billingCycle ?? "MONTHLY",
				note: null,
			});
	}, [open, lead, reset]);

	const handleSave = async (values: WinSchema) => {
		if (!lead) return;
		try {
			await winLead({ id: lead.id, ...values }).unwrap();
			notify.success("Venda registrada com sucesso 🎉");
			onClose();
		} catch (error) {
			notify.apiError(error);
		}
	};

	return (
		<Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="xs" data-cy="win-lead-dialog">
			<DialogTitle onClose={onClose} subtitle={lead?.companyName ?? lead?.name}>
				Marcar como ganho
			</DialogTitle>
			<DialogContent>
				<form id="win-form" onSubmit={handleSubmit(handleSave)} noValidate>
					<GridForm>
						<RHFTextField
							className="col-span-12"
							control={control}
							name="estimatedValue"
							label="Valor mensal fechado*"
							type="number"
							autoFocus
							disabled={isLoading}
							error={!!errors.estimatedValue}
							helperText={errors.estimatedValue?.message}
							slotProps={{
								input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> },
								htmlInput: { min: 0, step: 10 },
							}}
						/>
						<RHFSelect
							className="col-span-12 md:col-span-6"
							control={control}
							name="plan"
							label="Plano contratado"
							options={PLANS.map((p) => ({ label: p.name, value: p.name }))}
							disabled={isLoading}
						/>
						<RHFSelect
							className="col-span-12 md:col-span-6"
							control={control}
							name="billingCycle"
							label="Ciclo"
							emptyLabel={false}
							options={(["MONTHLY", "ANNUAL"] as const).map((c) => ({ label: BILLING_CYCLE_LABELS[c], value: c }))}
							disabled={isLoading}
						/>
						<RHFTextField
							className="col-span-12"
							control={control}
							name="note"
							label="Observação"
							multiline
							minRows={2}
							disabled={isLoading}
						/>
					</GridForm>
				</form>
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" color="inherit" onClick={onClose} disabled={isLoading}>
					Cancelar
				</Button>
				<Button type="submit" form="win-form" color="success" loading={isLoading} data-cy="save-win">
					Confirmar venda
				</Button>
			</DialogActions>
		</Dialog>
	);
}

const loseSchema = z.object({
	reason: z
		.string({ required_error: "Motivo é obrigatório", invalid_type_error: "Motivo é obrigatório" })
		.min(1, "Motivo é obrigatório"),
	note: z.string().trim().max(2000).nullish(),
});
type LoseSchema = z.infer<typeof loseSchema>;

export function LoseLeadDialog({ open, lead, onClose }: Props) {
	const notify = useNotify();
	const [loseLead, { isLoading }] = useLoseLeadMutation();
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<LoseSchema>({ resolver: zodResolver(loseSchema) });

	useEffect(() => {
		if (open) reset({ reason: "", note: null });
	}, [open, reset]);

	const handleSave = async (values: LoseSchema) => {
		if (!lead) return;
		try {
			await loseLead({ id: lead.id, ...values }).unwrap();
			notify.success("Lead marcado como perdido");
			onClose();
		} catch (error) {
			notify.apiError(error);
		}
	};

	return (
		<Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="xs" data-cy="lose-lead-dialog">
			<DialogTitle onClose={onClose} subtitle={lead?.companyName ?? lead?.name}>
				Marcar como perdido
			</DialogTitle>
			<DialogContent>
				<form id="lose-form" onSubmit={handleSubmit(handleSave)} noValidate>
					<GridForm>
						<RHFSelect
							className="col-span-12"
							control={control}
							name="reason"
							label="Motivo*"
							emptyLabel={false}
							options={LOST_REASONS.map((r) => ({ label: r, value: r }))}
							disabled={isLoading}
							error={!!errors.reason}
							helperText={errors.reason?.message}
						/>
						<RHFTextField
							className="col-span-12"
							control={control}
							name="note"
							label="Detalhes"
							multiline
							minRows={3}
							disabled={isLoading}
						/>
					</GridForm>
				</form>
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" color="inherit" onClick={onClose} disabled={isLoading}>
					Cancelar
				</Button>
				<Button type="submit" form="lose-form" color="error" loading={isLoading} data-cy="save-lose">
					Marcar como perdido
				</Button>
			</DialogActions>
		</Dialog>
	);
}
