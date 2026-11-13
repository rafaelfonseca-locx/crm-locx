import { RHFDateField, RHFSelect, RHFTextField } from "@/components/form/fields";
import { GridForm } from "@/components/layout/Form";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { useNotify } from "@/hooks/useNotify";
import type { Lead } from "@/store/api/@types/lead.types";
import { useCreateActivityMutation, useGetUsersQuery, useMoveLeadStageMutation } from "@/store/api/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { addDays, setHours, setMinutes } from "date-fns";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod/v3";

const FORM_ID = "meeting-form";

const schema = z.object({
	title: z.string().trim().min(1, "Título é obrigatório").max(160),
	dueAt: z
		.string({ required_error: "Data é obrigatória", invalid_type_error: "Data é obrigatória" })
		.min(1, "Data é obrigatória"),
	meetingUrl: z.string().trim().max(300).nullish(),
	assigneeId: z.string().nullish(),
	body: z.string().trim().max(5000).nullish(),
	moveToMeetingStage: z.boolean(),
});
type Schema = z.infer<typeof schema>;

type Props = { open: boolean; lead: Lead | null; fromStageChange?: boolean; onClose: () => void };

const nextBusinessSlot = () => setMinutes(setHours(addDays(new Date(), 1), 10), 0).toISOString();

export function ScheduleMeetingDialog({ open, lead, fromStageChange, onClose }: Props) {
	const notify = useNotify();
	const { data: users } = useGetUsersQuery();
	const [createActivity, { isLoading }] = useCreateActivityMutation();
	const [moveStage, { isLoading: isMoving }] = useMoveLeadStageMutation();
	const isBusy = isLoading || isMoving;
	const canMove = !!lead && lead.status === "OPEN" && (lead.stage === "NEW" || lead.stage === "QUALIFICATION");

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<Schema>({ resolver: zodResolver(schema) });

	useEffect(() => {
		if (open && lead) {
			reset({
				title: `Reunião de apresentação · ${lead.companyName ?? lead.name}`,
				dueAt: nextBusinessSlot(),
				meetingUrl: null,
				assigneeId: lead.ownerId,
				body: null,
				moveToMeetingStage: canMove,
			});
		}
	}, [open, lead, reset, canMove]);

	const handleSave = async (values: Schema) => {
		if (!lead) return;
		try {
			await createActivity({ leadId: lead.id, type: "MEETING", ...values }).unwrap();
			notify.success("Reunião agendada com sucesso");
			onClose();
		} catch (error) {
			notify.apiError(error);
		}
	};

	const handleMoveOnly = async () => {
		if (!lead) return;
		try {
			await moveStage({ id: lead.id, stage: "MEETING" }).unwrap();
			notify.success("Lead movido para Reunião");
			onClose();
		} catch (error) {
			notify.apiError(error);
		}
	};

	return (
		<Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth="sm" data-cy="meeting-form-dialog">
			<DialogTitle
				onClose={onClose}
				subtitle={lead ? `${lead.name}${lead.companyName ? ` · ${lead.companyName}` : ""}` : undefined}
			>
				Agendar reunião
			</DialogTitle>
			<DialogContent>
				<form id={FORM_ID} onSubmit={handleSubmit(handleSave)} noValidate>
					<GridForm>
						<RHFTextField
							className="col-span-12"
							control={control}
							name="title"
							label="Título*"
							disabled={isBusy}
							error={!!errors.title}
							helperText={errors.title?.message}
						/>
						<RHFDateField
							className="col-span-12 md:col-span-6"
							control={control}
							name="dueAt"
							label="Data e hora*"
							withTime
							disabled={isBusy}
							error={!!errors.dueAt}
							helperText={errors.dueAt?.message}
						/>
						<RHFSelect
							className="col-span-12 md:col-span-6"
							control={control}
							name="assigneeId"
							label="Quem conduz"
							emptyLabel={false}
							options={(users?.data ?? []).map((u) => ({ label: u.name, value: u.id }))}
							disabled={isBusy}
						/>
						<RHFTextField
							className="col-span-12"
							control={control}
							name="meetingUrl"
							label="Link da reunião"
							placeholder="https://meet.google.com/..."
							disabled={isBusy}
						/>
						<RHFTextField
							className="col-span-12"
							control={control}
							name="body"
							label="Pauta"
							multiline
							minRows={2}
							disabled={isBusy}
						/>
						{canMove && (
							<Controller
								control={control}
								name="moveToMeetingStage"
								render={({ field }) => (
									<FormControlLabel
										className="col-span-12"
										control={
											<Checkbox
												checked={!!field.value}
												onChange={(e) => field.onChange(e.target.checked)}
												disabled={isBusy}
											/>
										}
										label="Mover o lead para a etapa Reunião"
									/>
								)}
							/>
						)}
					</GridForm>
				</form>
			</DialogContent>
			<DialogActions>
				{fromStageChange && canMove && (
					<Button variant="text" color="inherit" onClick={handleMoveOnly} disabled={isBusy} className="mr-auto">
						Mover sem agendar
					</Button>
				)}
				<Button variant="outlined" color="inherit" onClick={onClose} disabled={isBusy}>
					Cancelar
				</Button>
				<Button type="submit" form={FORM_ID} loading={isLoading} data-cy="save-meeting">
					Agendar
				</Button>
			</DialogActions>
		</Dialog>
	);
}
