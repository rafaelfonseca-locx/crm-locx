import { alpha, createTheme } from "@mui/material/styles";
import type {} from "@mui/material/themeCssVarsAugmentation";
import type {} from "@mui/x-charts/themeAugmentation";
import type {} from "@mui/x-date-pickers/themeAugmentation";

const brand = {
	primary: { main: "#FFCC00", dark: "#FBC02D", light: "#FDD835", contrastText: "#000000" },
	secondary: { main: "#3A271A", dark: "#2E1E13", light: "#6B4F3E", contrastText: "#FFFFFF" },
};

declare module "@mui/material/styles" {
	interface Palette {
		sidebar: { background: string; text: string; muted: string; hover: string; active: string };
	}
	interface PaletteOptions {
		sidebar?: { background: string; text: string; muted: string; hover: string; active: string };
	}
}

/** Tema MUI montado a partir do design system LocX (01-foundations.md). */
export const theme = createTheme({
	cssVariables: { colorSchemeSelector: "class" },
	colorSchemes: {
		light: {
			palette: {
				...brand,
				error: { main: "#D32F2F", dark: "#C62828", light: "#EF5350" },
				warning: { main: "#EF6C00", dark: "#E65100", light: "#FF9800" },
				info: { main: "#0288D1", dark: "#01579B", light: "#03A9F4" },
				success: { main: "#2E7D32", dark: "#1B5E20", light: "#4CAF50" },
				text: { primary: "rgba(0,0,0,0.87)", secondary: "rgba(0,0,0,0.60)", disabled: "rgba(0,0,0,0.38)" },
				background: { default: "#F6F6F6", paper: "#FFFFFF" },
				divider: "rgba(0,0,0,0.12)",
				sidebar: {
					background: "#1C140E",
					text: "rgba(255,255,255,0.92)",
					muted: "rgba(255,255,255,0.52)",
					hover: "rgba(255,255,255,0.06)",
					active: "rgba(255,204,0,0.14)",
				},
			},
		},
		dark: {
			palette: {
				...brand,
				primary: { main: "#FFCC00", dark: "#FBC02D", light: "#FFEE58", contrastText: "rgba(0,0,0,0.87)" },
				error: { main: "#F44336", dark: "#D32F2F", light: "#E57373" },
				warning: { main: "#FFA726", dark: "#F57C00", light: "#FFB74D" },
				info: { main: "#29B6F6", dark: "#0288D1", light: "#4FC3F7" },
				success: { main: "#66BB6A", dark: "#388E3C", light: "#81C784" },
				text: { primary: "#FFFFFF", secondary: "rgba(255,255,255,0.70)", disabled: "rgba(255,255,255,0.38)" },
				background: { default: "#121212", paper: "#1E1E1E" },
				divider: "rgba(255,255,255,0.12)",
				sidebar: {
					background: "#0C0C0C",
					text: "rgba(255,255,255,0.92)",
					muted: "rgba(255,255,255,0.5)",
					hover: "rgba(255,255,255,0.06)",
					active: "rgba(255,204,0,0.14)",
				},
			},
		},
	},
	breakpoints: { values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 } },
	shape: { borderRadius: 4 },
	typography: {
		fontFamily: '"Inter", Roboto, "Helvetica", Arial, sans-serif',
		htmlFontSize: 16,
		fontSize: 13,
		h1: { fontSize: 40, fontWeight: 700 },
		h2: { fontSize: 36, fontWeight: 700 },
		h3: { fontSize: 32, fontWeight: 700 },
		h4: { fontSize: 28, fontWeight: 700 },
		h5: { fontSize: 24, fontWeight: 700 },
		h6: { fontSize: 20, fontWeight: 700 },
		subtitle1: { fontSize: 16 },
		subtitle2: { fontSize: 14 },
		body1: { fontSize: "0.8125rem" },
		body2: { fontSize: "0.8125rem" },
		caption: { fontSize: 12 },
		button: { fontSize: 14, fontWeight: 600, textTransform: "none" },
	},
	components: {
		MuiButtonBase: { defaultProps: { disableRipple: true } },
		MuiButton: {
			defaultProps: { variant: "contained", color: "primary", disableElevation: true },
			styleOverrides: {
				root: { borderRadius: 4, boxShadow: "none", whiteSpace: "nowrap" },
				sizeSmall: { height: 32 },
				sizeMedium: { height: 40 },
				sizeLarge: { height: 48 },
			},
		},
		MuiIconButton: { styleOverrides: { root: { borderRadius: 4 } } },
		MuiPaper: {
			defaultProps: { elevation: 0 },
			styleOverrides: { rounded: { borderRadius: 12 } },
		},
		MuiCard: {
			styleOverrides: {
				root: ({ theme }) => ({ border: `1px solid ${theme.vars.palette.divider}`, borderRadius: 12 }),
			},
		},
		MuiDialog: { styleOverrides: { paper: { borderRadius: 12 } } },
		MuiDialogTitle: { styleOverrides: { root: { minHeight: 64, display: "flex", alignItems: "center" } } },
		MuiDialogActions: { styleOverrides: { root: { minHeight: 64, padding: "12px 24px", gap: 8 } } },
		MuiChip: {
			styleOverrides: {
				root: { borderRadius: 4, fontWeight: 500 },
				sizeSmall: { height: 24 },
			},
		},
		MuiAvatar: {
			styleOverrides: { root: { fontSize: 12, fontWeight: 600 } },
		},
		MuiTab: {
			styleOverrides: {
				root: {
					minHeight: 36,
					borderRadius: 8,
					textTransform: "none",
					fontSize: 13,
					fontWeight: 500,
					"&.Mui-selected": { fontWeight: 600, color: "var(--mui-palette-text-primary)" },
				},
			},
		},
		MuiTabs: {
			styleOverrides: {
				root: ({ theme }) => ({ minHeight: 42, borderBottom: `1px solid ${theme.vars.palette.divider}` }),
				indicator: { height: 3, borderRadius: "3px 3px 0 0" },
			},
		},
		MuiOutlinedInput: {
			styleOverrides: {
				root: ({ theme }) => ({
					borderRadius: 4,
					backgroundColor: theme.vars.palette.background.paper,
				}),
			},
		},
		MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
		MuiFormControl: { defaultProps: { size: "small" } },
		MuiLink: { defaultProps: { color: "info.main" } },
		MuiTooltip: {
			defaultProps: { arrow: true },
			styleOverrides: { tooltip: { fontSize: 12 } },
		},
		MuiMenu: { styleOverrides: { paper: { borderRadius: 8 } } },
		MuiPopover: { styleOverrides: { paper: { borderRadius: 8 } } },
		MuiAlert: { styleOverrides: { root: { borderRadius: 4 } } },
		MuiLinearProgress: { styleOverrides: { root: { borderRadius: 4, height: 6 }, bar: { borderRadius: 4 } } },
		MuiListItemButton: {
			styleOverrides: {
				root: ({ theme }) => ({
					borderRadius: 8,
					"&.Mui-selected": { backgroundColor: alpha(brand.primary.main, 0.14) },
					"&:hover": { backgroundColor: theme.vars.palette.action.hover },
				}),
			},
		},
	},
});
