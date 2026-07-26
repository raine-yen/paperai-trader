import type { ColorSchemeName } from "react-native";

export type ThemePreference = "system" | "light" | "dark" | "midnight";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export type ThemeColors = {
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

const dark: ThemeColors = {
  bg: "#050706",
  card: "#0A0E0C",
  panel: "#0E1411",
  panelAlt: "#151C18",
  line: "rgba(238,242,240,0.10)",
  lineGreen: "rgba(52,211,153,0.22)",
  text: "#F2F7F4",
  muted: "#A0ADA6",
  subtle: "#68736D",
  accent: "#34D399",
  accentDark: "#063D2D",
  accentSoft: "rgba(52,211,153,0.16)",
  red: "#FF6572",
  redSoft: "rgba(255,101,114,0.16)",
  blue: "#60A5FA",
  amber: "#F7C948",
};

const light: ThemeColors = {
  bg: "#F4F7F5",
  card: "#FFFFFF",
  panel: "#ECF2EE",
  panelAlt: "#E4ECE7",
  line: "rgba(22,40,31,0.14)",
  lineGreen: "rgba(4,120,87,0.20)",
  text: "#16281F",
  muted: "#4C6257",
  subtle: "#66796F",
  accent: "#047857",
  accentDark: "#D8F5E8",
  accentSoft: "rgba(4,120,87,0.12)",
  red: "#BE123C",
  redSoft: "rgba(190,18,60,0.10)",
  blue: "#0369A1",
  amber: "#A16207",
};

const midnight: ThemeColors = {
  ...dark,
  bg: "#02060C",
  card: "#050C14",
  panel: "#09131F",
  panelAlt: "#0E1A28",
  line: "rgba(185,214,233,0.14)",
  text: "#F1F8F5",
  muted: "#A4B7AD",
  subtle: "#6E8177",
  accent: "#2DE69D",
  accentDark: "#053B2B",
  accentSoft: "rgba(45,230,157,0.17)",
  blue: "#5BC0FA",
};

export const themes: Record<ResolvedTheme, ThemeColors> = { light, dark, midnight };

// Existing components read this object during render. Mutating its values keeps
// the design tokens centralized without duplicating every component style.
export const colors: ThemeColors = { ...dark };

export function resolveTheme(preference: ThemePreference, system: ColorSchemeName): ResolvedTheme {
  if (preference !== "system") return preference;
  return system === "light" ? "light" : "dark";
}

export function applyTheme(theme: ResolvedTheme) {
  Object.assign(colors, themes[theme]);
}

export const themeOptions: Array<{ value: ThemePreference; label: string; description: string }> = [
  { value: "system", label: "System", description: "Match your device" },
  { value: "light", label: "Light", description: "Bright, low-glare surfaces" },
  { value: "dark", label: "Dark", description: "Balanced trading palette" },
  { value: "midnight", label: "Midnight", description: "Maximum dark contrast" },
];

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };
export const navHeight = 116;
export const font = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
