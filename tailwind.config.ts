import type { Config } from "tailwindcss";

/**
 * Pink STEM brand. The magenta is lifted straight from the organization's
 * logo; the darker steps exist so text and buttons clear WCAG AA contrast on
 * white, which the raw brand color does not.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF1FE",
          100: "#FFDFFE",
          200: "#FFBEFC",
          300: "#FF8DF8",
          400: "#FF4DF3",
          500: "#F400F4",
          600: "#C700C7",
          700: "#9E009E",
          800: "#740074",
          900: "#4E0050",
          950: "#2E0030",
        },
        ink: {
          50: "#F8F6F9",
          100: "#F1EDF2",
          200: "#E6E0E8",
          300: "#CFC6D2",
          400: "#A297A7",
          500: "#766B7C",
          600: "#574C5D",
          700: "#3F3545",
          800: "#2A2230",
          900: "#1A1320",
        },
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(26, 19, 32, 0.06), 0 1px 3px rgba(26, 19, 32, 0.04)",
        raised:
          "0 4px 12px rgba(26, 19, 32, 0.08), 0 1px 3px rgba(26, 19, 32, 0.06)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 220ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
