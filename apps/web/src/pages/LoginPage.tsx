import { RHFTextField } from "@/components/form/fields";
import { LocxLogo } from "@/components/layout/AppLayout/Brand";
import { getApiErrorMessage } from "@/store/api/apiService";
import { useLoginMutation } from "@/store/api/hooks";
import { setToken } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { CalendarCheck, FlaskConical, Inbox, Trophy } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate } from "react-router";
import { z } from "zod/v3";

const loginSchema = z.object({
	email: z.string().trim().min(1, "E-mail é obrigatório").email("E-mail inválido"),
	password: z.string().min(1, "Senha é obrigatória"),
});
type LoginSchema = z.infer<typeof loginSchema>;

const STEPS = [
	{
		icon: Inbox,
		title: "Lead chega do RD Station ou do Cal.com",
		text: "Distribuído em rodízio, com tarefa de primeiro contato.",
	},
	{ icon: CalendarCheck, title: "Pré-atendimento e reunião", text: "Qualifique, agende e envolva quem precisar." },
	{ icon: FlaskConical, title: "Trial de 5 a 7 dias", text: "Roteiro diário de acompanhamento até a decisão." },
	{ icon: Trophy, title: "Venda", text: "Feche, registre o valor e acompanhe a conversão." },
];

export function LoginPage() {
	const dispatch = useAppDispatch();
	const token = useAppSelector((s) => s.auth.token);
	const [login, { isLoading, error }] = useLoginMutation();
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginSchema>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

	if (token) return <Navigate to="/" replace />;

	const handleLogin = async (values: LoginSchema) => {
		try {
			const result = await login(values).unwrap();
			dispatch(setToken(result.data.token));
		} catch {
			// O erro é exibido pelo Alert abaixo
		}
	};

	return (
		<div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
			<Box
				className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
				sx={{ bgcolor: "#111113", color: "rgba(255,255,255,0.92)" }}
			>
				<LocxLogo forceDark height={34} />
				<div className="max-w-md space-y-8 relative z-10">
					<div className="space-y-3">
						<Typography className="text-4xl font-bold leading-tight tracking-tight">
							Do primeiro contato à{" "}
							<Box component="span" sx={{ color: "primary.main" }}>
								assinatura
							</Box>
							.
						</Typography>
						<Typography sx={{ color: "rgba(255,255,255,0.55)" }} className="text-base">
							O funil comercial da LocX em um só lugar, com o time inteiro acompanhando cada lead.
						</Typography>
					</div>
					<ol className="space-y-4">
						{STEPS.map(({ icon: Icon, title, text }, i) => (
							<li key={title} className="flex gap-4">
								<Box
									className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
									sx={{ bgcolor: "rgba(255,204,0,0.14)", color: "primary.main" }}
								>
									<Icon size={18} strokeWidth={1.5} />
								</Box>
								<div>
									<div className="text-sm font-semibold">
										{i + 1}. {title}
									</div>
									<Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)" }}>
										{text}
									</Typography>
								</div>
							</li>
						))}
					</ol>
				</div>
				<Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
					LocX · CRM comercial
				</Typography>
				<Box
					aria-hidden
					className="absolute -right-32 -bottom-32 w-[420px] h-[420px] rounded-full"
					sx={{ background: "radial-gradient(circle, rgba(255,204,0,0.18), transparent 65%)" }}
				/>
			</Box>
			<div className="flex items-center justify-center p-6">
				<form onSubmit={handleSubmit(handleLogin)} className="w-full max-w-sm space-y-5" noValidate>
					<div className="lg:hidden pb-4">
						<LocxLogo height={30} />
					</div>
					<div>
						<Typography component="h1" className="text-2xl font-bold">
							Entrar
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Use seu e-mail corporativo. No primeiro acesso você cria sua própria senha.
						</Typography>
					</div>
					{error && <Alert severity="error">{getApiErrorMessage(error)}</Alert>}
					<RHFTextField
						control={control}
						name="email"
						label="E-mail"
						type="email"
						autoComplete="email"
						autoFocus
						error={!!errors.email}
						helperText={errors.email?.message}
					/>
					<RHFTextField
						control={control}
						name="password"
						label="Senha"
						type="password"
						autoComplete="current-password"
						error={!!errors.password}
						helperText={errors.password?.message}
					/>
					<Button type="submit" fullWidth size="large" loading={isLoading} data-cy="login-submit">
						Entrar
					</Button>
				</form>
			</div>
		</div>
	);
}
