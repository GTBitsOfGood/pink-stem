import Container from "@/components/layout/Container";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Container className="py-8 sm:py-10">{children}</Container>;
}
