import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import clsx from "clsx";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function PaperForm({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<Paper className={clsx("p-4 rounded-xl", className)} sx={{ border: 1, borderColor: "divider" }}>
			{children}
		</Paper>
	);
}

export function GridForm({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={clsx("grid grid-cols-12 gap-3 m-0", className)}>{children}</div>;
}

type SectionFormProps = {
	title: string;
	children: ReactNode;
	className?: string;
	classNameContainer?: string;
	divider?: boolean;
	infoText?: string;
	isSubSection?: boolean;
	headerActions?: ReactNode;
};

export function SectionForm({
	title,
	children,
	className,
	classNameContainer,
	divider,
	infoText,
	isSubSection,
	headerActions,
}: SectionFormProps) {
	return (
		<section className={clsx("space-y-3", classNameContainer)}>
			<div className="flex items-center justify-between gap-2 min-h-8">
				<div className="flex items-center gap-1">
					<Typography
						variant={isSubSection ? "subtitle2" : "subtitle1"}
						className={isSubSection ? "font-medium" : "font-bold"}
					>
						{title}
					</Typography>
					{infoText && (
						<Tooltip title={infoText}>
							<Info size={16} strokeWidth={1.5} className="opacity-60" />
						</Tooltip>
					)}
				</div>
				{headerActions}
			</div>
			<GridForm className={className}>{children}</GridForm>
			{divider && <Divider />}
		</section>
	);
}
