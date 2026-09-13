import type { ColorSchemeName } from "react-native";

export type ThemePreference = "system" | "light" | "dark" | "midnight";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

type SemanticColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  brand: string;
  brandPressed: string;
  brandSoft: string;
  onBrand: string;
  bullish: string;
  bullishSoft: string;
  bearish: string;
  bearishSoft: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  focusRing: string;
  chartGrid: string;
  chartCrosshair: string;
  scrim: string;
  shadow: string;
};

// Legacy aliases keep the API/data layer and existing screens stable while the
// redesigned components consume the explicit semantic roles above.
export type ThemeColors = SemanticColors & {
  bg: string;
  card: string;
  panel: string;
  panelAlt: string;
  line: string;
  lineGreen: string;
  text: string;
  muted: string;
  subtle: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  red: string;
  redSoft: string;
  blue: string;
  amber: string;
};

function defineTheme(semantic: SemanticColors): ThemeColors {
  return {
    ...semantic,
    bg: semantic.background,
    card: semantic.surface,
    panel: semantic.surfaceElevated,
    panelAlt: semantic.surfaceMuted,
    line: semantic.border,
    lineGreen: semantic.brandSoft,
    text: semantic.textPrimary,
    muted: semantic.textSecondary,
    subtle: semantic.textTertiary,
    accent: semantic.brand,
    accentDark: semantic.brandPressed,
    accentSoft: semantic.brandSoft,
    red: semantic.bearish,
    redSoft: semantic.bearishSoft,
    blue: semantic.info,
    amber: semantic.warning,
  };
}

const light = defineTheme({
  background: "#F4F1EB",
  surface: "#FFFDF9",
  surfaceElevated: "#FFFFFF",
  surfaceMuted: "#ECE8E0",
  border: "#DED9CF",
  borderStrong: "#B9B2A7",
  divider: "#E7E2D9",
  textPrimary: "#17263B",
  textSecondary: "#526176",
  textTertiary: "#727D8C",
  textInverse: "#FDFBF7",
  brand: "#2C765B",
  brandPressed: "#205A46",
  brandSoft: "#DFECE5",
  onBrand: "#FFFFFF",
  bullish: "#2F7D5C",
  bullishSoft: "#E0EEE6",
  bearish: "#B14B4B",
  bearishSoft: "#F5E3E1",
  success: "#2F7D5C",
  warning: "#8B5D25",
  error: "#B14B4B",
  info: "#365F84",
  focusRing: "#1E5E91",
  chartGrid: "#E5E1D9",
  chartCrosshair: "#677386",
  scrim: "rgba(23, 38, 59, 0.42)",
  shadow: "rgba(31, 39, 48, 0.12)",
});

const dark = defineTheme({
  background: "#17191C",
  surface: "#202328",
  surfaceElevated: "#25292E",
  surfaceMuted: "#2D3137",
  border: "#383D44",
  borderStrong: "#515861",
  divider: "#343940",
  textPrimary: "#F5F2EC",
  textSecondary: "#B6BCC5",
  textTertiary: "#8E96A1",
  textInverse: "#17263B",
  brand: "#78C5A3",
  brandPressed: "#5AAE8B",
  brandSoft: "#29463A",
  onBrand: "#102A20",
  bullish: "#79C7A4",
  bullishSoft: "#29463A",
  bearish: "#FF7B8B",
  bearishSoft: "#4B292E",
  success: "#79C7A4",
  warning: "#F2C66D",
  error: "#FF7B8B",
  info: "#8ABCE8",
  focusRing: "#74A9FF",
  chartGrid: "#343940",
  chartCrosshair: "#89929D",
  scrim: "rgba(0, 0, 0, 0.68)",
  shadow: "rgba(0, 0, 0, 0.36)",
});

const midnight = defineTheme({
  background: "#030914",
  surface: "#07111D",
  surfaceElevated: "#0B1826",
  surfaceMuted: "#122337",
  border: "#20364C",
  borderStrong: "#36536E",
  divider: "#172A3E",
  textPrimary: "#F2F7FA",
  textSecondary: "#B1C1CB",
  textTertiary: "#8296A3",
  textInverse: "#03130D",
  brand: "#58E1AE",
  brandPressed: "#3BC895",
  brandSoft: "#103A31",
  onBrand: "#031A12",
  bullish: "#65E2AE",
  bullishSoft: "#103A31",
  bearish: "#FF8090",
  bearishSoft: "#3C1C29",
  success: "#65E2AE",
  warning: "#F5CA73",
  error: "#FF8090",
  info: "#80C7FF",
  focusRing: "#7AABFF",
  chartGrid: "#172A3E",
  chartCrosshair: "#6E8799",
  scrim: "rgba(0, 3, 9, 0.72)",
  shadow: "rgba(0, 0, 0, 0.42)",
});

export const themes: Record<ResolvedTheme, ThemeColors> = { light, dark, midnight };

// Components read this token object during render. Updating it before the app
// tree renders preserves one centralized palette without duplicating styles.
export const colors: ThemeColors = { ...dark };

export function resolveTheme(preference: ThemePreference, system: ColorSchemeName): ResolvedTheme {
  if (preference !== "system") return preference;
  return system === "light" ? "light" : "dark";
}

export function applyTheme(theme: ResolvedTheme) {
  Object.assign(colors, themes[theme]);
}

export const themeOptions: Array<{ value: ThemePreference; label: string; description: string }> = [
  { value: "system", label: "System", description: "Follow your device appearance" },
  { value: "light", label: "Light", description: "Mineral white with forest accents" },
  { value: "dark", label: "Dark", description: "Quiet graphite trading surfaces" },
  { value: "midnight", label: "Midnight", description: "Blue-black focus for low light" },
];

export const space = { x1: 4, x2: 8, x3: 12, x4: 16, x6: 24, x8: 32, x12: 48, x16: 64 } as const;
export const radius = { sm: 6, md: 10, lg: 14, xl: 18, pill: 999 } as const;
export const typeScale = { caption: 11, body: 14, bodyLarge: 16, title: 21, display: 36, hero: 48 } as const;
export const navHeight = 86;
export const tabletNavWidth = 88;
export const contentMaxWidth = 1120;
export const layoutBreakpoints = { regular: 760, wide: 980 } as const;
export const font = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
