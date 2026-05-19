import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#050607",
          card: "#0c0f12",
          elevated: "#131820",
          border: "#20262d",
          soft: "#0f1419",
        },
        accent: {
          DEFAULT: "#6ee7b7",
          green: "#00c853",
          red: "#ff5252",
          yellow: "#f4c430",
          blue: "#38bdf8",
          violet: "#a78bfa",
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
