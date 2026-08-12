"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton, inputClass } from "@/components/ui";
import { MEMBERS } from "@/lib/members";

type KeyRow = {
  id: string;
  label: string;
  status: string;
  originalOwner: { name: string } | null;
  assignments: Array<{ holder: { id: string; name: string } }>;
};

export function KeysClient() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [label, setLabel] = useState("");
  const [holderId, setHolderId] = useState<string>(MEMBERS[0].id);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/keys", { cache: "no-store" });
    setKeys((await res.json()).keys ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addKey() {
    if (!label.trim()) return;
    setBusy(true);
    await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, holderId }),
    });
    setLabel("");
    setBusy(false);
    await load();
  }

  async function transfer(keyId: string, nextHolderId: string) {
    await fetch("/api/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, action: "transfer", holderId: nextHolderId }),
    });
    await load();
  }

  async function lost(keyId: string) {
    await fetch("/api/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, action: "lost" }),
    });
    await load();
  }

  async function found(keyId: string) {
    await fetch("/api/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, action: "found" }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Keys</h1>
      <p className="text-sm text-mute">Who has which key right now.</p>

      <Card className="space-y-3">
        <p className="text-sm font-semibold">Add a key</p>
        <input
          className={inputClass}
          placeholder="Bike key, cupboard key…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <select className={inputClass} value={holderId} onChange={(e) => setHolderId(e.target.value)}>
          {MEMBERS.map((m) => (
            <option key={m.id} value={m.id}>
              Starts with {m.short}
            </option>
          ))}
        </select>
        <PrimaryButton onClick={addKey} disabled={busy || !label.trim()}>
          {busy ? "Adding…" : "Add key"}
        </PrimaryButton>
      </Card>

      {keys.length === 0 ? (
        <p className="text-sm text-mute">No keys yet — add one above.</p>
      ) : (
        keys.map((k) => {
          const holder = k.assignments[0]?.holder;
          return (
            <Card key={k.id}>
              <p className="font-semibold">{k.label}</p>
              <p className="text-sm text-mute">
                With: {holder?.name.split(" ")[0] ?? "—"} · Owner:{" "}
                {k.originalOwner?.name.split(" ")[0] ?? "—"} · {k.status}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {MEMBERS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => transfer(k.id, m.id)}
                    className="rounded-full border border-line px-3 py-1 text-xs"
                  >
                    Give to {m.short}
                  </button>
                ))}
                {k.status === "lost" ? (
                  <button
                    type="button"
                    onClick={() => found(k.id)}
                    className="rounded-full border border-home px-3 py-1 text-xs text-home"
                  >
                    Mark found
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => lost(k.id)}
                    className="rounded-full border border-owe px-3 py-1 text-xs text-owe"
                  >
                    Lost
                  </button>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
