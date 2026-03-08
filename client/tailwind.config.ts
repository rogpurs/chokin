import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0f766e",
        accent: "#0ea5e9"
      }
    }
  },
  plugins: []
} satisfies Config;
