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
          app: "#07090f",
          shell: "#0b0f17",
          void: "#07090f",
          base: "#0b0f17",
          elevated: "#10151f",
          panel: "#131a26",
          overlay: "#1c2535",
          input: "#0f141d",
          cyan: "#3b9eff",
          amber: "#e5a84a",
          violet: "#7c6fe6",
          green: "#34c38a",
          red: "#e85d75",
          text: {
            primary: "#e8edf5",
            secondary: "#9aa6b8",
            muted: "#667385",
            code: "#a8b8cc"
          }
        },
        console: {
          app: "#07090f",
          shell: "#0b0f17",
          surface: "#131a26",
          raised: "#171f2d",
          input: "#0f141d"
        },
        surface: {
          950: "#07090f",
          900: "#0b0f17",
          800: "#131a26"
        }
      },
      fontFamily: {
        display: ["var(--font-geist-sans)", "sans-serif"],
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        "neural-panel": "0 0 0 1px rgba(148, 163, 184, 0.1), 0 4px 16px rgba(0, 0, 0, 0.28)",
        "neural-glow": "0 0 0 1px rgba(59, 158, 255, 0.18), inset 0 0 0 1px rgba(59, 158, 255, 0.06)"
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
