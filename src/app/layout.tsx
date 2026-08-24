import type { Metadata } from "next";
import QueryProvider from "@/components/QueryProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Pink Stem",
  description: "Notes app built on the Bits of Good Next.js architecture",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
