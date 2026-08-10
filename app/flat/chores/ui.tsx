"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

type Row = {
  id: string;
  status: string;
  member: { name: string };
  task: { title: string };
  completedBy: { name: string } | null;
};

export function ChoresClient() {
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const res = await fetch("/api/chores", { cache: "no-store" });
    setRows((await res.json()).assignments ?? []);
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, action: "done" | "skip") {
    await fetch("/api/chores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Chores</h1>
      {rows.map((r) => (
        <Card key={r.id}>
          <p className="font-semibold">{r.task.title}</p>
          <p className="text-sm text-mute">
            {r.member.name.split(" ")[0]} · {r.status}
            {r.completedBy ? ` · done by ${r.completedBy.name.split(" ")[0]}` : ""}
          </p>
          {r.status === "pending" ? (
            <div className="mt-3 flex gap-2">
              <button onClick={() => act(r.id, "done")} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white">
                Done
              </button>
              <button onClick={() => act(r.id, "skip")} className="rounded-lg border border-line px-3 py-1.5 text-sm">
                Skip
              </button>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
