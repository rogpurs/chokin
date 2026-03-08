import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0f766e", light: "#14b8a6", dark: "#0d9488", 50: "#f0fdfa", 100: "#ccfbf1", 600: "#0d9488", 700: "#0f766e", 800: "#115e59", 900: "#134e4a" },
        accent: { DEFAULT: "#0ea5e9", light: "#38bdf8", 100: "#e0f2fe", 600: "#0284c7" },
        surface: { DEFAULT: "#ffffff", dark: "#1e293b" },
        muted: { DEFAULT: "#64748b", light: "#94a3b8", dark: "#475569" },
        danger: { DEFAULT: "#ef4444", light: "#fca5a5", bg: "#fef2f2" },
        success: { DEFAULT: "#10b981", light: "#6ee7b7", bg: "#ecfdf5" },
        warn: { DEFAULT: "#f59e0b", bg: "#fffbeb" },
      },
      fontFamily: {
        sans: ['"Hiragino Kaku Gothic ProN"', '"Yu Gothic"', '"Noto Sans JP"', 'sans-serif'],
        mono: ['"SF Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: { xl: "12px", "2xl": "16px", "3xl": "20px" },
      spacing: { safe: "env(safe-area-inset-bottom, 0px)" },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
      },
    }
  },
  plugins: []
} satisfies Config;
