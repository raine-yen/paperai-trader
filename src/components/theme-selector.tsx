"use client";

import { Moon, Palette, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/components/theme-provider";

const options: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "midnight", label: "Midnight" },
];

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const Icon = resolvedTheme === "light" ? Sun : resolvedTheme === "midnight" ? Palette : Moon;

  return (
    <div className={compact ? "relative" : "space-y-2"}>
      {!compact && <label htmlFor="theme-preference" className="label">Appearance</label>}
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
        <select
          id={compact ? "nav-theme-preference" : "theme-preference"}
          aria-label={compact ? "Color theme" : undefined}
          className={compact ? "input h-10 pl-9 pr-8 text-xs" : "input pl-10"}
          value={preference}
          onChange={(event) => setPreference(event.target.value as ThemePreference)}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
    </div>
  );
}
