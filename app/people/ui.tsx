"use client";

import { useEffect, useState } from "react";
import { Card, Label } from "@/components/ui";
import { Rupee } from "@/components/Rupee";

type Person = {
  id: string;
  name: string;
  short: string;
  netPaise: number;
  presence: string;
  keyLabel: string | null;
  chore: string | null;
  drinksMilk: boolean;
};

function presenceText(state: string) {
  if (state === "at_flat") return "At flat";
  if (state === "away") return "Away";
  return "Unknown";
}

export function PeopleClient({ meId }: { meId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const me = people.find((p) => p.id === meId);

  async function load() {
    const res = await fetch("/api/people", { cache: "no-store" });
    setPeople((await res.json()).people ?? []);
  }
  useEffect(() => { load(); }, []);

  async function toggleMilk(participates: boolean) {
    await fetch("/api/milk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participates }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">People</h1>
      {people.map((p) => (
        <Card key={p.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-mute">{presenceText(p.presence)}</p>
            </div>
            <Rupee paise={p.netPaise} signed className="font-semibold" />
          </div>
          <p className="mt-2 text-sm text-mute">
            Key: {p.keyLabel ?? "—"} · Chore: {p.chore ?? "—"} · Milk: {p.drinksMilk ? "yes" : "no"}
          </p>
        </Card>
      ))}

      {me ? (
        <Card>
          <Label>My milk</Label>
          <p className="mb-2 text-sm text-mute">Turn off if you don’t drink milk. New milk bills won’t include you.</p>
          <button
            onClick={() => toggleMilk(!me.drinksMilk)}
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold"
          >
            {me.drinksMilk ? "I don’t drink milk" : "I drink milk"}
          </button>
        </Card>
      ) : null}
    </div>
  );
}
