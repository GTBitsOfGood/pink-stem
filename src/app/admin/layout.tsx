import AdminNav from "@/components/admin/AdminNav";
import Container from "@/components/layout/Container";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container className="py-8 sm:py-10">
      <p className="eyebrow mb-1">Admin console</p>
      <AdminNav />
      {children}
    </Container>
  );
}
