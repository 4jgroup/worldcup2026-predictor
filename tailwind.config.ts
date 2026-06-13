import type { Config } from "tailwindcss";

/* Tokens del tema oscuro deportivo del Predictor. */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0E17",
        panel: "#141B2D",
        panel2: "#1B2435",
        line: "#243049",
        ink: "#E8EDF7",
        muted: "#8A96AC",
        green: "#2BD980",
        gold: "#F4B740",
        blue: "#5B8DEF",
        red: "#FF4D5E",
      },
      fontFamily: {
        display: ["var(--font-display)", "Barlow Condensed", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "14px" },
      boxShadow: { card: "0 1px 0 rgba(255,255,255,0.03), 0 10px 30px rgba(0,0,0,0.25)" },
    },
  },
  plugins: [],
};
export default config;
