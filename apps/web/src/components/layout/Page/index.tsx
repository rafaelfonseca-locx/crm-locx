import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import clsx from "clsx";
import type { ReactNode } from "react";

type PageSimpleProps = { header?: ReactNode; content?: ReactNode; className?: string };

/** Página padrão: cabeçalho (título + ações) e conteúdo com scroll próprio. */
export function PageSimple({ header, content, className }: PageSimpleProps) {
	return (
		<Box className={clsx("flex flex-col min-h-full", className)} sx={{ backgroundColor: "background.default" }}>
			{header && <div className="container-box px-4 lg:px-6 pt-5 pb-4">{header}</div>}
			<div className="container-box flex-1 px-4 lg:px-6 pb-8">{content}</div>
		</Box>
	);
}

type PageTitleProps = { title: string; icon?: ReactNode; subInfo?: ReactNode; className?: string };

export function PageTitle({ title, icon, subInfo, className }: PageTitleProps) {
	return (
		<div className={clsx("flex items-center gap-3 min-w-0", className)}>
			{icon && (
				<Box
					className="flex items-center justify-center shrink-0 w-8 h-8 rounded-md"
					sx={{ backgroundColor: "primary.main", color: "primary.contrastText" }}
					aria-hidden
				>
					{icon}
				</Box>
			)}
			<div className="min-w-0">
				<Typography component="h1" className="text-xl font-bold truncate leading-tight">
					{title}
				</Typography>
				{subInfo && (
					<Typography variant="caption" color="text.secondary" component="div" className="truncate">
						{subInfo}
					</Typography>
				)}
			</div>
		</div>
	);
}

export function PageActions({ children }: { children: ReactNode }) {
	return <div className="flex flex-1 flex-wrap items-center justify-end gap-2">{children}</div>;
}

/** Linha de cabeçalho: título à esquerda, ações à direita. */
export function PageHeader({ children }: { children: ReactNode }) {
	return <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">{children}</div>;
}
