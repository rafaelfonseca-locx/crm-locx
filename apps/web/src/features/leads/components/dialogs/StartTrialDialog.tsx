import { RHFDateField, RHFTextField } from "@/components/form/fields";
import { GridForm } from "@/components/layout/Form";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { useNotify } from "@/hooks/useNotify";
import type { Lead } from "@/store/api/@types/lead.types";
import { useStartTrialMutation } from "@/store/api/hooks";
import { formatShortDate } from "@/utils/formatters";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { addDays, startOfDay } from "date-fns";
import { CalendarCheck } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod/v3";

const FORM_ID = "trial-form";

const schema = z.object({
	startDate: z
		.string({ required_error: "Data de início é obrigatória", invalid_type_error: "Data de início é obrigatória" })
		.min(1, "Data de início é obrigatória"),
	durationDays: z.number().int().min(5).max(7),
	accountUrl: z.string().trim().max(300).nullish(),
	notes: z.string().trim().max(2000).nullish(),
});
type Schema = z.infer<typeof schema>;

export function trialChecklistPreview(durationDays: number) {
	const middle = Math.max(2, Math.floor(durationDays / 2));
	return [
		{ day: 0, title: "Kickoff e configuração da conta de teste" },
		{ day: 1, title: "Check-in de primeiros passos" },
		{ day: middle, title: "Acompanhamento de uso e dúvidas" },
		{ day: durationDays - 1, title: "Apresentação de resultados e proposta" },
		{ day: durationDays, title: "Decisão e fechamento" },
	];
}

type Props = { open: boolean; lead: Lead | null; onClose: () => void };

export function StartTrialDialog({ open, lead, onClose }: Props) {
	const notify = useNotify();
	const [startTrial, { isLoading }] = useStartTrialMutation();
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<Schema>({ resolver: zodResolver(schema) });
	const [startDate, durationDays] = useWatch({ control, name: ["startDate", "durationDays"] });

	useEffect(() => {
		if (open)
			reset({ startDate: startOfDay(new Date()).toISOString(), durationDays: 7, accountUrl: null, notes: null });
	}, [open, reset]);

	const handleSave = async (values: Schema) => {
		if (!lead) return;
		try {
			await startTrial({ leadId: lead.id, ...values }).unwrap();
			notify.success("Trial iniciado com sucesso");
			onClose();
		} catch (error) {
			notify.apiError(error);
		}
	};

	const endDate = startDate ? addDays(new Date(startDate), durationDays ?? 7) : null;
	const hadTrial = lead?.trial && lead.trial.status !== "ACTIVE";

	return (
		<Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" data-cy="trial-form-dialog">
			<DialogTitle
				onClose={onClose}
				subtitle={lead ? `${lead.name}${lead.companyName ? ` · ${lead.companyName}` : ""}` : undefined}
			>
				Iniciar trial
			</DialogTitle>
			<DialogContent>
				<form id={FORM_ID} onSubmit={handleSubmit(handleSave)} noValidate className="space-y-4">
					{hadTrial && <Alert severity="info">Este lead já teve um trial. Um novo trial substitui o anterior.</Alert>}
					<GridForm>
						<RHFDateField
							className="col-span-12 md:col-span-6"
							control={control}
							name="startDate"
							label="Início*"
							disabled={isLoading}
							error={!!errors.startDate}
							helperText={errors.startDate?.message}
						/>
						<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
							<Typography variant="caption" color="text.secondary">
								Duração do teste
							</Typography>
							<Controller
								control={control}
								name="durationDays"
								render={({ field }) => (
									<ToggleButtonGroup
										exclusive
										size="small"
										value={field.value}
										onChange={(_, v) => v && field.onChange(v)}
										aria-label="Duração do trial"
										fullWidth
									>
										{[5, 6, 7].map((d) => (
											<ToggleButton key={d} value={d} data-cy={`trial-duration-${d}`}>
												{d} dias
											</ToggleButton>
										))}
									</ToggleButtonGroup>
								)}
							/>
						</div>
						<RHFTextField
							className="col-span-12"
							control={control}
							name="accountUrl"
							label="Link da conta de teste"
							placeholder="https://app.locx.com.br/..."
							disabled={isLoading}
						/>
						<RHFTextField
							className="col-span-12"
							control={control}
							name="notes"
							label="Objetivos do teste"
							multiline
							minRows={2}
							disabled={isLoading}
						/>
					</GridForm>
					<div className="rounded-lg border p-3 space-y-2">
						<div className="flex items-center gap-2">
							<CalendarCheck size={16} strokeWidth={1.5} />
							<Typography variant="body2" fontWeight={600}>
								Roteiro de acompanhamento
							</Typography>
							{endDate && (
								<Typography variant="caption" color="text.secondary" className="ml-auto">
									Termina em {formatShortDate(endDate)}
								</Typography>
							)}
						</div>
						<ol className="space-y-1">
							{trialChecklistPreview(durationDays ?? 7).map((item) => (
								<li key={item.day + item.title} className="flex gap-3 text-sm">
									<Typography variant="caption" color="text.secondary" className="w-8 shrink-0 font-semibold">
										D{item.day}
									</Typography>
									<Typography variant="body2">{item.title}</Typography>
								</li>
							))}
						</ol>
					</div>
				</form>
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" color="inherit" onClick={onClose} disabled={isLoading}>
					Cancelar
				</Button>
				<Button type="submit" form={FORM_ID} loading={isLoading} data-cy="save-trial">
					Iniciar trial
				</Button>
			</DialogActions>
		</Dialog>
	);
}
