import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { LoadingContent } from "./components/feedback/LoadingContent";
import { MessageSnackbar } from "./components/feedback/MessageSnackbar";
import { AppLayout } from "./components/layout/AppLayout/AppLayout";
import { AskDialogProvider } from "./hooks/useAskDialog";
import { useAuth } from "./hooks/useAuth";
import { AgendaPage } from "./pages/AgendaPage";
import { DashboardPage } from "./pages/DashboardPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { LeadDetailsPage } from "./pages/LeadDetailsPage";
import { LeadsListingPage } from "./pages/LeadsListingPage";
import { LoginPage } from "./pages/LoginPage";
import { PipelinePage } from "./pages/PipelinePage";
import { TeamPage } from "./pages/TeamPage";
import { TrialsPage } from "./pages/TrialsPage";

function ProtectedRoutes() {
	const { token, user, isLoading } = useAuth();
	if (!token) return <Navigate to="/login" replace />;
	if (isLoading || !user) return <LoadingContent />;
	return <AppLayout />;
}

export function App() {
	return (
		<BrowserRouter>
			<AskDialogProvider>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route element={<ProtectedRoutes />}>
						<Route index element={<DashboardPage />} />
						<Route path="pipeline" element={<PipelinePage />} />
						<Route path="leads" element={<LeadsListingPage />} />
						<Route path="leads/:id" element={<LeadDetailsPage />} />
						<Route path="trials" element={<TrialsPage />} />
						<Route path="agenda" element={<AgendaPage />} />
						<Route path="equipe" element={<TeamPage />} />
						<Route path="integracoes" element={<IntegrationsPage />} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Route>
				</Routes>
				<MessageSnackbar />
			</AskDialogProvider>
		</BrowserRouter>
	);
}
