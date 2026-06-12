import type { Config } from "tailwindcss";

const variableColor = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

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
          app: variableColor("--color-bg-app"),
          shell: variableColor("--color-bg-shell"),
          void: variableColor("--color-bg-void"),
          base: variableColor("--color-bg-base"),
          elevated: variableColor("--color-bg-elevated"),
          panel: variableColor("--color-bg-panel"),
          overlay: variableColor("--color-bg-overlay"),
          input: variableColor("--color-bg-input"),
          cyan: variableColor("--color-accent-cyan"),
          amber: variableColor("--color-accent-amber"),
          violet: variableColor("--color-accent-violet"),
          green: variableColor("--color-accent-green"),
          red: variableColor("--color-accent-red"),
          text: {
            primary: variableColor("--color-text-primary"),
            secondary: variableColor("--color-text-secondary"),
            muted: variableColor("--color-text-muted"),
            code: variableColor("--color-text-code")
          }
        },
        console: {
          app: variableColor("--color-bg-app"),
          shell: variableColor("--color-bg-shell"),
          surface: variableColor("--color-bg-panel"),
          raised: variableColor("--color-bg-raised"),
          input: variableColor("--color-bg-input")
        },
        surface: {
          950: variableColor("--color-bg-void"),
          900: variableColor("--color-bg-shell"),
          800: variableColor("--color-bg-panel")
        }
      },
      fontFamily: {
        display: ["var(--font-geist-sans)", "sans-serif"],
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        "neural-panel": "0 0 0 1px rgb(188 211 238 / 0.1), 0 18px 42px rgb(0 0 0 / 0.28)",
        "neural-soft": "0 14px 36px rgb(0 0 0 / 0.24), inset 0 1px 0 rgb(236 247 255 / 0.06)",
        "neural-glow": "0 0 0 1px rgb(var(--color-accent-cyan) / 0.2), inset 0 1px 0 rgb(255 255 255 / 0.06)"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "status-pulse": {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.62", transform: "scale(1.08)" }
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
        "fade-in": "fade-in 180ms ease-out both",
        "fade-in-up": "fade-in-up 280ms ease-out both",
        "status-pulse": "status-pulse 1.6s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "message-enter": "message-enter 180ms ease-out both"
      },
      zIndex: {
        shell: "20",
        topbar: "30",
        overlay: "40",
        modal: "50",
        toast: "60"
      }
    }
  },
  plugins: []
};

export default config;
