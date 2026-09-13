import Image from "next/image";
import { ReactNode } from "react";
import Container from "@/components/layout/Container";

/** The framed panel every sign-in style page sits in. */
export default function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Container className="flex max-w-md flex-col items-center py-12 sm:py-16">
      <Image
        src="/brand/pinkstem-mark.png"
        alt=""
        width={56}
        height={56}
        className="mb-4 h-14 w-14"
      />
      <div className="w-full rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-bold text-ink-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? (
        <p className="mt-5 text-center text-sm text-ink-500">{footer}</p>
      ) : null}
    </Container>
  );
}
