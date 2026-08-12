"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MEMBERS } from "@/lib/members";
import { ClientOnly } from "@/components/ClientOnly";
import { inputClass } from "@/components/ui";

type Step = "pick" | "set" | "enter";

function WhoInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/home";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("pick");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");

  async function pick(id: string) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/session?memberId=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not continue. Try again.");
      return;
    }
    setPickedId(id);
    setPickedName(json.name || id);
    setPin("");
    setPin2("");
    setStep(json.hasPin ? "enter" : "set");
  }

  async function submitPin() {
    if (!pickedId) return;
    setError("");
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    if (step === "set" && pin !== pin2) {
      setError("PINs don’t match.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: pickedId,
        pin,
        mode: step === "set" ? "set" : "login",
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not continue. Try again.");
      return;
    }
    router.replace(next.startsWith("/") ? next : "/home");
    router.refresh();
  }

  function backToPick() {
    setStep("pick");
    setPickedId(null);
    setPin("");
    setPin2("");
    setError("");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">
        Shared Flat OS
      </p>

      {step === "pick" ? (
        <>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Who are you?</h1>
          <p className="mt-2 text-sm text-mute">
            Tap your name. First time you’ll set a 4-digit PIN; after that enter it to open.
          </p>
          <div className="mt-8 grid gap-3">
            {MEMBERS.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={busy}
                onClick={() => pick(m.id)}
                suppressHydrationWarning
                className="rounded-2xl border border-line bg-card px-4 py-4 text-left shadow-card transition active:scale-[0.99] disabled:opacity-60"
              >
                <p className="text-lg font-semibold">{m.name}</p>
                <p className="text-sm text-mute">
                  {busy && pickedId === m.id ? "Opening…" : "Continue as this person"}
                </p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {step === "set" ? "Set your PIN" : "Enter your PIN"}
          </h1>
          <p className="mt-2 text-sm text-mute">
            {pickedName}
            {step === "set"
              ? " — choose a 4-digit PIN only you know."
              : " — enter your 4-digit PIN."}
          </p>
          <div className="mt-8 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs text-mute">
                {step === "set" ? "New PIN" : "PIN"}
              </span>
              <input
                className={`${inputClass} text-center text-2xl tracking-[0.4em]`}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                autoFocus
              />
            </label>
            {step === "set" ? (
              <label className="block">
                <span className="mb-1 block text-xs text-mute">Confirm PIN</span>
                <input
                  className={`${inputClass} text-center text-2xl tracking-[0.4em]`}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </label>
            ) : null}
            <button
              type="button"
              disabled={busy || pin.length !== 4 || (step === "set" && pin2.length !== 4)}
              onClick={submitPin}
              className="w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Checking…" : step === "set" ? "Save PIN & continue" : "Unlock"}
            </button>
            {step === "enter" ? (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (!pickedId) return;
                  if (!confirm("Reset PIN for this person? They’ll set a new 4-digit PIN next.")) return;
                  setBusy(true);
                  setError("");
                  const res = await fetch("/api/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ memberId: pickedId, action: "reset_pin" }),
                  });
                  setBusy(false);
                  if (!res.ok) {
                    setError("Could not reset PIN.");
                    return;
                  }
                  setPin("");
                  setPin2("");
                  setStep("set");
                }}
                className="w-full py-2 text-sm text-mute underline"
              >
                Forgot PIN? Reset it
              </button>
            ) : null}
            <button
              type="button"
              onClick={backToPick}
              className="w-full py-2 text-sm text-mute underline"
            >
              ← Different person
            </button>
          </div>
        </>
      )}

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
