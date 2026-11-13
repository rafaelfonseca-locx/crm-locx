import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ptBR as pickersPtBR } from "@mui/x-date-pickers/locales";
import { ptBR } from "date-fns/locale";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { App } from "./App";
import { store } from "./store";
import { theme } from "./theme/theme";
import "./styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado");

createRoot(root).render(
	<StrictMode>
		<Provider store={store}>
			<StyledEngineProvider enableCssLayer>
				<GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
				<ThemeProvider theme={theme} defaultMode="light">
					<CssBaseline />
					<LocalizationProvider
						dateAdapter={AdapterDateFns}
						adapterLocale={ptBR}
						localeText={pickersPtBR.components.MuiLocalizationProvider.defaultProps.localeText}
					>
						<App />
					</LocalizationProvider>
				</ThemeProvider>
			</StyledEngineProvider>
		</Provider>
	</StrictMode>,
);
