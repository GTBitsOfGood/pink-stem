"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>
          ) => void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Google Identity Services button. Renders nothing when sign-in is not configured. */
export default function GoogleButton({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const render = useCallback(() => {
    if (!CLIENT_ID || !ref.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (r) => onCredential(r.credential),
    });
    window.google.accounts.id.renderButton(ref.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "continue_with",
    });
  }, [onCredential]);

  useEffect(() => {
    if (ready) render();
  }, [ready, render]);

  if (!CLIENT_ID) return null;
  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
        <span className="h-px flex-1 bg-ink-200" /> or{" "}
        <span className="h-px flex-1 bg-ink-200" />
      </div>
      <div ref={ref} className="flex justify-center" />
    </>
  );
}
