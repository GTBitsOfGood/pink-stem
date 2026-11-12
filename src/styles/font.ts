import { Montserrat } from "next/font/google";

/** The typeface pinkstem.org is set in. Exposed as a CSS variable for Tailwind. */
export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});
