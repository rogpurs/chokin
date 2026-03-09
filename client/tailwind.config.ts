import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0f766e",
          light: "#14b8a6",
          dark: "#0d9488",
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        accent: { DEFAULT: "#0ea5e9", light: "#38bdf8", 100: "#e0f2fe", 600: "#0284c7" },
        surface: { DEFAULT: "#ffffff", dark: "#1c1c1e", dark2: "#2c2c2e" },
        muted: { DEFAULT: "#6e6e73", light: "#aeaeb2", dark: "#48484a" },
        danger: { DEFAULT: "#ff3b30", light: "#ff6961", bg: "#fff1f0" },
        success: { DEFAULT: "#34c759", light: "#30d158", bg: "#f0fdf4" },
        warn: { DEFAULT: "#ff9500", bg: "#fff8f0" },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Hiragino Kaku Gothic ProN"',
          '"Yu Gothic"',
          '"Noto Sans JP"',
          "sans-serif",
        ],
      },
      borderRadius: { xl: "12px", "2xl": "18px", "3xl": "24px", "4xl": "32px" },
      boxShadow: {
        card: "0 1px 4px 0 rgb(0 0 0 / 0.07), 0 0 0 1px rgb(0 0 0 / 0.03)",
        "card-hover": "0 8px 24px -4px rgb(0 0 0 / 0.12), 0 0 0 1px rgb(0 0 0 / 0.04)",
        nav: "0 -0.5px 0 rgb(0 0 0 / 0.1)",
        modal: "0 32px 64px -12px rgb(0 0 0 / 0.3)",
        btn: "0 2px 8px 0 rgb(15 118 110 / 0.28)",
        hero: "0 16px 40px -8px rgb(15 118 110 / 0.35)",
        numpad: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "check-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "60%": { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.28s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "check-pop": "check-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
    },
  },
  plugins: [],
} satisfies Config;
