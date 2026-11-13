import { createTheme } from "@mui/material/styles";
import type {} from "@mui/material/themeCssVarsAugmentation";
import type {} from "@mui/x-charts/themeAugmentation";
import type {} from "@mui/x-date-pickers/themeAugmentation";

/**
 * Tema MUI a partir do design system LocX: amarelo LocX como cor principal,
 * neutros em grafite (sem o marrom), Inter 13px e raios do DS.
 */

type SidebarPalette = {
	background: string;
	border: string;
	text: string;
	muted: string;
	hover: string;
	active: string;
	activeText: string;
};

declare module "@mui/material/styles" {
	interface Palette {
		sidebar: SidebarPalette;
		surface: { subtle: string; column: string };
	}
	interface PaletteOptions {
		sidebar?: SidebarPalette;
		surface?: { subtle: string; column: string };
	}
}

const primary = { main: "#FFCC00", dark: "#F2B705", light: "#FFE066", contrastText: "#111111" };
const secondary = { main: "#27272A", dark: "#18181B", light: "#52525B", contrastText: "#FFFFFF" };

export const theme = createTheme({
	cssVariables: { colorSchemeSelector: "class" },
	colorSchemes: {
		light: {
			palette: {
				primary,
				secondary,
				error: { main: "#D32F2F", dark: "#C62828", light: "#EF5350" },
				warning: { main: "#E65100", dark: "#BF360C", light: "#FF9800" },
				info: { main: "#0277BD", dark: "#01579B", light: "#03A9F4" },
				success: { main: "#2E7D32", dark: "#1B5E20", light: "#4CAF50" },
				text: { primary: "rgba(17,17,17,0.92)", secondary: "rgba(17,17,17,0.60)", disabled: "rgba(17,17,17,0.38)" },
				background: { default: "#F6F6F7", paper: "#FFFFFF" },
				divider: "rgba(17,17,17,0.09)",
				action: { hover: "rgba(17,17,17,0.04)", selected: "rgba(17,17,17,0.07)" },
				sidebar: {
					background: "#FFFFFF",
					border: "rgba(17,17,17,0.08)",
					text: "rgba(17,17,17,0.80)",
					muted: "rgba(17,17,17,0.45)",
					hover: "rgba(17,17,17,0.045)",
					active: "rgba(255,204,0,0.20)",
					activeText: "#111111",
				},
				surface: { subtle: "#FAFAFA", column: "#F0F0F2" },
			},
		},
		dark: {
			palette: {
				primary: { ...primary, light: "#FFEE58", contrastText: "#111111" },
				secondary: { main: "#E4E4E7", dark: "#D4D4D8", light: "#F4F4F5", contrastText: "#111111" },
				error: { main: "#F44336", dark: "#D32F2F", light: "#E57373" },
				warning: { main: "#FFA726", dark: "#F57C00", light: "#FFB74D" },
				info: { main: "#29B6F6", dark: "#0288D1", light: "#4FC3F7" },
				success: { main: "#66BB6A", dark: "#388E3C", light: "#81C784" },
				text: { primary: "#F4F4F5", secondary: "rgba(244,244,245,0.66)", disabled: "rgba(244,244,245,0.38)" },
				background: { default: "#0F0F10", paper: "#18181B" },
				divider: "rgba(255,255,255,0.09)",
				sidebar: {
					background: "#141416",
					border: "rgba(255,255,255,0.07)",
					text: "rgba(244,244,245,0.86)",
					muted: "rgba(244,244,245,0.45)",
					hover: "rgba(255,255,255,0.05)",
					active: "rgba(255,204,0,0.14)",
					activeText: "#FFCC00",
				},
				surface: { subtle: "#1C1C1F", column: "#131315" },
			},
		},
	},
	breakpoints: { values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 } },
	shape: { borderRadius: 6 },
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
		button: { fontSize: 13, fontWeight: 600, textTransform: "none", letterSpacing: 0 },
	},
	components: {
		MuiButtonBase: { defaultProps: { disableRipple: true } },
		MuiButton: {
			defaultProps: { variant: "contained", color: "primary", disableElevation: true },
			styleOverrides: {
				root: { borderRadius: 8, boxShadow: "none", whiteSpace: "nowrap", paddingInline: 14 },
				sizeSmall: { height: 30, paddingInline: 10 },
				sizeMedium: { height: 36 },
				sizeLarge: { height: 44 },
				containedPrimary: { "&:hover": { backgroundColor: primary.dark } },
				// Botão secundário: borda suave em vez de contorno preto
				outlined: ({ theme }) => ({
					"&.MuiButton-colorInherit": {
						borderColor: theme.vars.palette.divider,
						backgroundColor: theme.vars.palette.background.paper,
						"&:hover": {
							backgroundColor: theme.vars.palette.action.hover,
							borderColor: theme.vars.palette.text.disabled,
						},
					},
				}),
			},
		},
		MuiIconButton: { styleOverrides: { root: { borderRadius: 8 } } },
		MuiPaper: {
			defaultProps: { elevation: 0 },
			styleOverrides: { rounded: { borderRadius: 12 } },
		},
		MuiDialog: { styleOverrides: { paper: { borderRadius: 14 } } },
		MuiDialogTitle: { styleOverrides: { root: { minHeight: 60, display: "flex", alignItems: "center" } } },
		MuiDialogActions: { styleOverrides: { root: { minHeight: 60, padding: "12px 24px", gap: 8 } } },
		MuiChip: {
			styleOverrides: {
				root: { borderRadius: 6, fontWeight: 500 },
				sizeSmall: { height: 22, fontSize: 12 },
				outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
			},
		},
		MuiAvatar: { styleOverrides: { root: { fontSize: 12, fontWeight: 600 } } },
		MuiTab: {
			styleOverrides: {
				root: ({ theme }) => ({
					minHeight: 40,
					textTransform: "none",
					fontSize: 13,
					fontWeight: 500,
					color: theme.vars.palette.text.secondary,
					"&.Mui-selected": { fontWeight: 600, color: theme.vars.palette.text.primary },
				}),
			},
		},
		MuiTabs: {
			styleOverrides: {
				root: ({ theme }) => ({ minHeight: 40, borderBottom: `1px solid ${theme.vars.palette.divider}` }),
				indicator: { height: 2, borderRadius: 2 },
			},
		},
		MuiOutlinedInput: {
			styleOverrides: {
				root: ({ theme }) => ({
					borderRadius: 8,
					backgroundColor: theme.vars.palette.background.paper,
					"& .MuiOutlinedInput-notchedOutline": { borderColor: theme.vars.palette.divider },
					"&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme.vars.palette.text.disabled },
				}),
			},
		},
		MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
		MuiFormControl: { defaultProps: { size: "small" } },
		MuiToggleButton: {
			styleOverrides: {
				root: ({ theme }) => ({
					textTransform: "none",
					fontWeight: 600,
					borderColor: theme.vars.palette.divider,
					color: theme.vars.palette.text.secondary,
					backgroundColor: theme.vars.palette.background.paper,
					"&.Mui-selected": {
						backgroundColor: theme.vars.palette.action.selected,
						color: theme.vars.palette.text.primary,
					},
				}),
			},
		},
		MuiTooltip: {
			defaultProps: { arrow: true, enterDelay: 250 },
			styleOverrides: {
				tooltip: { fontSize: 12, lineHeight: 1.45, padding: "6px 10px", maxWidth: 300, backgroundColor: "#18181B" },
				arrow: { color: "#18181B" },
			},
		},
		MuiLink: { defaultProps: { color: "info.main" } },
		MuiMenu: { styleOverrides: { paper: { borderRadius: 10 } } },
		MuiPopover: { styleOverrides: { paper: { borderRadius: 10 } } },
		MuiAlert: { styleOverrides: { root: { borderRadius: 8 } } },
		MuiLinearProgress: {
			styleOverrides: {
				root: ({ theme }) => ({ borderRadius: 4, height: 6, backgroundColor: theme.vars.palette.action.selected }),
				bar: { borderRadius: 4 },
			},
		},
		MuiCheckbox: {
			styleOverrides: { root: ({ theme }) => ({ "&.Mui-checked": { color: theme.vars.palette.text.primary } }) },
		},
	},
});
