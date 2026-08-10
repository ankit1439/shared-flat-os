"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton, inputClass } from "@/components/ui";
import { MEMBERS } from "@/lib/members";
import { Rupee } from "@/components/Rupee";

type Issue = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  costPaise: number | null;
  reportedBy: { name: string };
  assignedTo: { name: string } | null;
};

export function IssuesClient() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [cost, setCost] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/issues", { cache: "no-store" });
    setIssues((await res.json()).issues ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!title.trim()) return;
    await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, assignedToId: assignedToId || undefined }),
    });
    setTitle("");
    setDescription("");
    await load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Issues</h1>
      <Card className="space-y-3">
        <input className={inputClass} placeholder="Bathroom tap leaking" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={inputClass} placeholder="Details (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className={inputClass} value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
          <option value="">Assign later</option>
          {MEMBERS.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <PrimaryButton onClick={add}>Report</PrimaryButton>
      </Card>

      {issues.map((i) => (
        <Card key={i.id} className="space-y-2">
          <p className="font-semibold">{i.title}</p>
          <p className="text-xs text-mute">
            {i.reportedBy.name.split(" ")[0]} · {i.status}
            {i.assignedTo ? ` · ${i.assignedTo.name.split(" ")[0]}` : ""}
            {i.costPaise ? <> · <Rupee paise={i.costPaise} /></> : null}
          </p>
          {i.description ? <p className="text-sm">{i.description}</p> : null}
          {i.status !== "resolved" ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => patch(i.id, { status: "in_progress" })} className="rounded-lg border border-line px-3 py-1.5 text-sm">In progress</button>
              <button onClick={() => patch(i.id, { status: "resolved" })} className="rounded-lg border border-line px-3 py-1.5 text-sm">Resolved</button>
            </div>
          ) : null}
          {i.status !== "resolved" ? (
            <div className="flex gap-2">
              <input
                className={inputClass}
                inputMode="decimal"
                placeholder="Repair cost ₹"
                value={cost[i.id] ?? ""}
                onChange={(e) => setCost((c) => ({ ...c, [i.id]: e.target.value }))}
              />
              <button
                onClick={() => patch(i.id, { addCost: true, amountRupees: cost[i.id] })}
                className="whitespace-nowrap rounded-xl bg-ink px-3 text-sm font-semibold text-white"
              >
                Add bill
              </button>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
