"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MEMBERS } from "@/lib/members";
import { ClientOnly } from "@/components/ClientOnly";

function WhoInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/home";
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function pick(id: string) {
    setBusy(id);
    setError("");
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: id }),
    });
    if (!res.ok) {
      setError("Could not continue. Try again.");
      setBusy(null);
      return;
    }
    router.replace(next.startsWith("/") ? next : "/home");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">
        Shared Flat OS
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Who are you?</h1>
      <p className="mt-2 text-sm text-mute">
        Tap your name. This browser will remember you. Nothing else.
      </p>

      <div className="mt-8 grid gap-3">
        {MEMBERS.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={!!busy}
            onClick={() => pick(m.id)}
            suppressHydrationWarning
            className="rounded-2xl border border-line bg-card px-4 py-4 text-left shadow-card transition active:scale-[0.99] disabled:opacity-60"
          >
            <p className="text-lg font-semibold">{m.name}</p>
            <p className="text-sm text-mute">{busy === m.id ? "Opening…" : "Continue as this person"}</p>
          </button>
        ))}
      </div>
      {error ? <p className="mt-4 text-sm text-owe">{error}</p> : null}
    </div>
  );
}

function WhoFallback() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">
        Shared Flat OS
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Who are you?</h1>
      <p className="mt-2 text-sm text-mute">Loading…</p>
    </div>
  );
}

export default function WhoPage() {
  return (
    <Suspense fallback={<WhoFallback />}>
      <ClientOnly fallback={<WhoFallback />}>
        <WhoInner />
      </ClientOnly>
    </Suspense>
  );
}
