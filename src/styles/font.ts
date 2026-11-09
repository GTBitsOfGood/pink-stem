import localFont from "next/font/local";

/** The typeface pinkstem.org is set in. Exposed as a CSS variable for Tailwind. */
export const montserrat = localFont({
  src: "../../public/fonts/montserrat-latin-variable.woff2",
  variable: "--font-montserrat",
  display: "swap",
});
