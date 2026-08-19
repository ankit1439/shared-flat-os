"use client";

import { useEffect, useState } from "react";
import { Card, Label, PrimaryButton, inputClass } from "@/components/ui";
import { Rupee } from "@/components/Rupee";

type Person = {
  id: string;
  name: string;
  short: string;
  netPaise: number;
  vsMe: { owePaise: number; receivePaise: number } | null;
  presence: string;
  lastSeenAt?: string | null;
  keyLabel: string | null;
  chore: string | null;
  drinksMilk: boolean;
  away?: { start: string; end: string; note: string | null } | null;
};

type Absence = {
  id: string;
  startDate: string;
  endDate: string;
  note: string | null;
};

function presenceText(state: string) {
  if (state === "at_flat") return "At flat";
  if (state === "away") return "Away";
  return "Unknown";
}

export function PeopleClient({ meId }: { meId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const me = people.find((p) => p.id === meId);

  async function load() {
    const [p, a] = await Promise.all([
      fetch("/api/people", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/absence", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setPeople(p.people ?? []);
    setAbsences(a.absences ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleMilk(participates: boolean) {
    await fetch("/api/milk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participates }),
    });
    await load();
  }

  async function addAbsence() {
    if (!startDate || !endDate) return;
    await fetch("/api/absence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, note }),
    });
    setStartDate("");
    setEndDate("");
    setNote("");
    await load();
  }

  async function removeAbsence(id: string) {
    await fetch("/api/absence", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
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
              <p className="text-sm text-mute">
                {presenceText(p.presence)}
                {p.lastSeenAt
                  ? ` · seen ${new Date(p.lastSeenAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </p>
              {p.away ? (
                <p className="mt-1 text-xs text-owe">
                  Planned away till{" "}
                  {new Date(p.away.end).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                  {p.away.note ? ` · ${p.away.note}` : ""}
                </p>
              ) : null}
            </div>
            {p.id === meId ? (
              <span className="text-xs text-mute">You</span>
            ) : p.vsMe?.owePaise ? (
              <span className="text-right text-sm font-semibold text-owe">
                You owe
                <br />
                <Rupee paise={p.vsMe.owePaise} />
              </span>
            ) : p.vsMe?.receivePaise ? (
              <span className="text-right text-sm font-semibold text-get">
                Owes you
                <br />
                <Rupee paise={p.vsMe.receivePaise} />
              </span>
            ) : (
              <span className="text-sm text-mute">Even</span>
            )}
          </div>
          <p className="mt-2 text-sm text-mute">
            Key: {p.keyLabel ?? "—"} · Chore: {p.chore ?? "—"} · Milk:{" "}
            {p.drinksMilk ? "yes" : "no"}
          </p>
        </Card>
      ))}

      {me ? (
        <Card>
          <Label>My milk</Label>
          <p className="mb-2 text-sm text-mute">
            Turn off if you don’t drink milk. New milk bills won’t include you.
          </p>
          <button
            type="button"
            onClick={() => toggleMilk(!me.drinksMilk)}
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold"
          >
            {me.drinksMilk ? "I don’t drink milk" : "I drink milk"}
          </button>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <Label>Planned away</Label>
        <p className="text-xs text-mute">
          Going home for a few days? Mark it so others know. You’ll show as Away during those dates.
        </p>
        <input
          type="date"
          className={inputClass}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className={inputClass}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <PrimaryButton onClick={addAbsence} disabled={!startDate || !endDate}>
          Save planned away
        </PrimaryButton>
        {absences.length > 0 ? (
          <div className="space-y-2 pt-1">
            {absences.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
              >
                <div>
                  <p>
                    {new Date(a.startDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    →{" "}
                    {new Date(a.endDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                  {a.note ? <p className="text-xs text-mute">{a.note}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeAbsence(a.id)}
                  className="text-xs text-owe underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
