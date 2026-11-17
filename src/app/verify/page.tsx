"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/Primitives";

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) router.push(`/verify/${encodeURIComponent(code.trim())}`);
  };

  return (
    <Container className="max-w-2xl py-10">
      <PageHeader
        eyebrow="Certificate verification"
        title="Verify a Pink STEM certificate"
        description="Schools, scholarship committees, and employers can confirm a volunteer certificate without contacting Pink STEM. Enter the verification code printed on the document, or scan its QR code."
      />
      <Card>
        <CardBody>
          <form
            onSubmit={submit}
            className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
          >
            <Input
              label="Verification code"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              className="font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="submit" size="md" className="h-10">
              Verify
            </Button>
          </form>
        </CardBody>
      </Card>
    </Container>
  );
}
