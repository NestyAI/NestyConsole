import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        neural: {
          void: "#05070D",
          base: "#0A0E1A",
          elevated: "#101420",
          panel: "#161C2E",
          overlay: "#1D2438",
          input: "#0F1320",
          cyan: "#00E8FF",
          amber: "#FFB020",
          violet: "#8B5CF6",
          green: "#10D98A",
          red: "#FF4D6A",
          text: {
            primary: "#EEF2FF",
            secondary: "#8892A8",
            muted: "#4A5268",
            code: "#7EE8A2"
          }
        },
        surface: {
          950: "#0a0f1c",
          900: "#10182b",
          800: "#15213a"
        }
      },
      fontFamily: {
        display: ["var(--font-chakra-petch)", "sans-serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        "neural-panel": "0 0 0 1px rgba(107, 118, 150, 0.18), 0 12px 38px rgba(3, 8, 20, 0.66)",
        "neural-glow": "0 0 24px rgba(0, 232, 255, 0.24)"
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "status-pulse": {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(1.08)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "message-enter": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 220ms ease-out both",
        "status-pulse": "status-pulse 1.4s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "message-enter": "message-enter 180ms ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
