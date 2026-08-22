export const metadata = { title: "Pink Stem", description: "MERN + Next.js starter" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
