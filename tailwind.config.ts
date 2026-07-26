import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gray: {
          50: "rgb(var(--color-gray-50) / <alpha-value>)",
          100: "rgb(var(--color-gray-100) / <alpha-value>)",
          200: "rgb(var(--color-gray-200) / <alpha-value>)",
          300: "rgb(var(--color-gray-300) / <alpha-value>)",
          400: "rgb(var(--color-gray-400) / <alpha-value>)",
          500: "rgb(var(--color-gray-500) / <alpha-value>)",
          600: "rgb(var(--color-gray-600) / <alpha-value>)",
        },
        bg: {
          DEFAULT: "rgb(var(--color-bg) / <alpha-value>)",
          card: "rgb(var(--color-card) / <alpha-value>)",
          elevated: "rgb(var(--color-elevated) / <alpha-value>)",
          border: "rgb(var(--color-border) / <alpha-value>)",
          soft: "rgb(var(--color-soft) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          green: "rgb(var(--color-green) / <alpha-value>)",
          red: "rgb(var(--color-red) / <alpha-value>)",
          yellow: "rgb(var(--color-yellow) / <alpha-value>)",
          blue: "rgb(var(--color-blue) / <alpha-value>)",
          violet: "rgb(var(--color-violet) / <alpha-value>)",
        },
        muted: "#7b8794",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      animation: {
        "pulse-soft": "pulse 3s ease-in-out infinite",
        "fade-in": "fade-in 0.28s ease-out",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
