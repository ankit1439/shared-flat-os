"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton, inputClass } from "@/components/ui";
import { MEMBERS } from "@/lib/members";

type Row = {
  id: string;
  status: string;
  member: { id: string; name: string };
  task: { title: string };
  completedBy: { name: string } | null;
};

export function ChoresClient({ meId }: { meId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState("");
  const [assignId, setAssignId] = useState<string>(meId);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/chores", { cache: "no-store" });
    const json = await res.json();
    setRows(json.assignments ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    await fetch("/api/chores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, memberId: assignId }),
    });
    setTitle("");
    setBusy(false);
    await load();
  }

  async function act(id: string, action: "done" | "skip") {
    await fetch("/api/chores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await load();
  }

  async function reassign(id: string, memberId: string) {
    await fetch("/api/chores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "reassign", memberId }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Chores</h1>
      <p className="text-sm text-mute">This week&apos;s jobs — mark done when finished.</p>

      <Card className="space-y-3">
        <p className="text-sm font-semibold">Add weekly chore</p>
        <input
          className={inputClass}
          placeholder="Mop bathroom, clean balcony…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select className={inputClass} value={assignId} onChange={(e) => setAssignId(e.target.value)}>
          {MEMBERS.map((m) => (
            <option key={m.id} value={m.id}>
              Assign to {m.name}
            </option>
          ))}
        </select>
        <PrimaryButton onClick={add} disabled={busy || !title.trim()}>
          {busy ? "Adding…" : "Add chore"}
        </PrimaryButton>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-mute">No chores this week — add one above.</p>
      ) : (
        rows.map((r) => (
          <Card key={r.id}>
            <p className="font-semibold">{r.task.title}</p>
            <p className="text-sm text-mute">
              {r.member.name.split(" ")[0]} · {r.status}
              {r.completedBy ? ` · done by ${r.completedBy.name.split(" ")[0]}` : ""}
            </p>
            {r.status === "pending" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => act(r.id, "done")}
                  className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => act(r.id, "skip")}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm"
                >
                  Skip
                </button>
                <select
                  className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
                  value={r.member.id}
                  onChange={(e) => reassign(r.id, e.target.value)}
                >
                  {MEMBERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      Reassign to {m.short}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}
