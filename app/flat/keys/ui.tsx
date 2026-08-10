"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
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

  async function load() {
    const res = await fetch("/api/keys", { cache: "no-store" });
    setKeys((await res.json()).keys ?? []);
  }
  useEffect(() => { load(); }, []);

  async function transfer(keyId: string, holderId: string) {
    await fetch("/api/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, action: "transfer", holderId, reason: "borrow" }),
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Keys</h1>
      {keys.map((k) => {
        const holder = k.assignments[0]?.holder;
        return (
          <Card key={k.id}>
            <p className="font-semibold">{k.label}</p>
            <p className="text-sm text-mute">
              With: {holder?.name.split(" ")[0] ?? "—"} · Owner: {k.originalOwner?.name.split(" ")[0] ?? "—"} · {k.status}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MEMBERS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => transfer(k.id, m.id)}
                  className="rounded-full border border-line px-3 py-1 text-xs"
                >
                  Give to {m.short}
                </button>
              ))}
              <button onClick={() => lost(k.id)} className="rounded-full border border-owe px-3 py-1 text-xs text-owe">
                Lost
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
