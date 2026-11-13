import MenuItem from "@mui/material/MenuItem";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";

type ControlledProps<T extends FieldValues> = { control: Control<T>; name: FieldPath<T> };

type RHFTextFieldProps<T extends FieldValues> = ControlledProps<T> & Omit<TextFieldProps, "name" | "defaultValue">;

/** Campo de texto ligado ao React Hook Form. O erro vem do chamador (error/helperText). */
export function RHFTextField<T extends FieldValues>({ control, name, type, ...props }: RHFTextFieldProps<T>) {
	return (
		<Controller
			control={control}
			name={name}
			render={({ field }) => (
				<TextField
					{...props}
					{...field}
					id={props.id ?? name}
					type={type}
					value={field.value ?? ""}
					onChange={(e) =>
						field.onChange(type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)
					}
					slotProps={{ ...props.slotProps, htmlInput: { "data-cy": name, ...(props.slotProps?.htmlInput as object) } }}
				/>
			)}
		/>
	);
}

type Option = { label: string; value: string };
type RHFSelectProps<T extends FieldValues> = ControlledProps<T> &
	Omit<TextFieldProps, "name" | "select" | "defaultValue"> & { options: Option[]; emptyLabel?: string | false };

export function RHFSelect<T extends FieldValues>({
	control,
	name,
	options,
	emptyLabel = "Nenhum",
	...props
}: RHFSelectProps<T>) {
	return (
		<Controller
			control={control}
			name={name}
			render={({ field }) => (
				<TextField
					{...props}
					{...field}
					select
					id={props.id ?? name}
					value={field.value ?? ""}
					onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
					slotProps={{ ...props.slotProps, htmlInput: { "data-cy": name } }}
				>
					{emptyLabel !== false && (
						<MenuItem value="">
							<em>{emptyLabel}</em>
						</MenuItem>
					)}
					{options.map((o) => (
						<MenuItem key={o.value} value={o.value}>
							{o.label}
						</MenuItem>
					))}
				</TextField>
			)}
		/>
	);
}

type RHFDateProps<T extends FieldValues> = ControlledProps<T> & {
	label: string;
	className?: string;
	error?: boolean;
	helperText?: string;
	disabled?: boolean;
	withTime?: boolean;
	disablePast?: boolean;
};

/** Data (ou data e hora) guardada como ISO string. */
export function RHFDateField<T extends FieldValues>({
	control,
	name,
	label,
	className,
	error,
	helperText,
	disabled,
	withTime,
	disablePast,
}: RHFDateProps<T>) {
	return (
		<Controller
			control={control}
			name={name}
			render={({ field }) => {
				const common = {
					className,
					label,
					disabled,
					disablePast,
					value: field.value ? new Date(field.value) : null,
					onChange: (value: Date | null) =>
						field.onChange(value && !Number.isNaN(value.getTime()) ? value.toISOString() : null),
					slotProps: {
						textField: { size: "small" as const, fullWidth: true, error, helperText, id: name, onBlur: field.onBlur },
					},
				};
				return withTime ? (
					<DateTimePicker {...common} format="dd/MM/yyyy HH:mm" ampm={false} />
				) : (
					<DatePicker {...common} format="dd/MM/yyyy" />
				);
			}}
		/>
	);
}
