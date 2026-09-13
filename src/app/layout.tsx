import type { Metadata } from "next";
import QueryProvider from "@/components/QueryProvider";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import { ToastProvider } from "@/components/ui/Toast";
import { montserrat } from "@/styles/font";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pink STEM Volunteer Hub",
    template: "%s · Pink STEM Volunteer Hub",
  },
  description:
    "Find a shift, get cleared, show up, and earn verified service hours with Pink STEM, Inc. — breaking barriers for girls in STEM across Georgia.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <QueryProvider>
          <ToastProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
