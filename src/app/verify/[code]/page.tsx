"use client";

import { useParams } from "next/navigation";
import VerifyResult from "@/components/certificates/VerifyResult";
import Container from "@/components/layout/Container";
import { PageHeader } from "@/components/ui/Primitives";

export default function VerifyCodePage() {
  const { code } = useParams<{ code: string }>();
  return (
    <Container className="max-w-2xl py-10">
      <PageHeader
        eyebrow="Certificate verification"
        title="Verify a Pink STEM certificate"
        back={{ href: "/verify", label: "Check a different code" }}
      />
      <VerifyResult code={decodeURIComponent(code)} />
    </Container>
  );
}
