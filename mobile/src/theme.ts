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
  background: "#F2F6F3",
  surface: "#FFFFFF",
  surfaceElevated: "#F8FAF9",
  surfaceMuted: "#E7EEE9",
  border: "#D7E1DA",
  borderStrong: "#AEBFB4",
  divider: "#E1E8E3",
  textPrimary: "#10231A",
  textSecondary: "#40574B",
  textTertiary: "#586D61",
  textInverse: "#F7FCF9",
  brand: "#075E45",
  brandPressed: "#064B38",
  brandSoft: "#D9EEE5",
  onBrand: "#FFFFFF",
  bullish: "#087A55",
  bullishSoft: "#DDF2E8",
  bearish: "#B4233F",
  bearishSoft: "#F8E4E8",
  success: "#087A55",
  warning: "#8A5A00",
  error: "#B4233F",
  info: "#195B8A",
  focusRing: "#0B6EEC",
  chartGrid: "#DCE5DF",
  chartCrosshair: "#597064",
  scrim: "rgba(7, 18, 12, 0.48)",
  shadow: "rgba(9, 31, 20, 0.14)",
});

const dark = defineTheme({
  background: "#06100B",
  surface: "#0A1710",
  surfaceElevated: "#0F1E16",
  surfaceMuted: "#17271F",
  border: "#24372D",
  borderStrong: "#3C5548",
  divider: "#1D3026",
  textPrimary: "#F2F8F4",
  textSecondary: "#AFC0B6",
  textTertiary: "#7D9387",
  textInverse: "#07150E",
  brand: "#5DE2A7",
  brandPressed: "#3FC98F",
  brandSoft: "#123A2A",
  onBrand: "#052117",
  bullish: "#66E3AA",
  bullishSoft: "#123A2A",
  bearish: "#FF7B8B",
  bearishSoft: "#3B1D25",
  success: "#66E3AA",
  warning: "#F2C66D",
  error: "#FF7B8B",
  info: "#84BDF5",
  focusRing: "#74A9FF",
  chartGrid: "#1D3026",
  chartCrosshair: "#6E887A",
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
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const typeScale = { caption: 12, body: 15, bodyLarge: 17, title: 22, display: 40, hero: 56 } as const;
export const navHeight = 104;
export const tabletNavWidth = 96;
export const contentMaxWidth = 1180;
export const layoutBreakpoints = { regular: 760, wide: 980 } as const;
export const font = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
