"use client";

import { useEffect, useState } from "react";
import { Card, Label, PrimaryButton, inputClass } from "@/components/ui";
import { MEMBERS } from "@/lib/members";

type Reminder = {
  id: string;
  message: string;
  status: string;
  dueAt: string | null;
  createdAt: string;
  fromId: string;
  fromName: string;
  toId: string | null;
  toName: string;
};

export function RemindersClient({ meId }: { meId: string }) {
  const [rows, setRows] = useState<Reminder[]>([]);
  const [message, setMessage] = useState("");
  const [toId, setToId] = useState("everyone");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/reminders", { cache: "no-store" });
    const json = await res.json();
    setRows(json.reminders ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        toId: toId === "everyone" ? null : toId,
        dueAt: dueAt || undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not save");
      return;
    }
    setMessage("");
    setDueAt("");
    await load();
  }

  async function act(id: string, action: "done" | "reopen" | "cancel") {
    await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await load();
  }

  const open = rows.filter((r) => r.status === "open");
  const closed = rows.filter((r) => r.status !== "open");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reminders</h1>
        <p className="text-sm text-mute">Tell someone something — they get a notification.</p>
      </div>

      <Card className="space-y-3">
        <Label>New reminder</Label>
        <textarea
          className={`${inputClass} min-h-[88px]`}
          placeholder="Bring detergent · Pay electricity · Don’t lock the main door…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <select className={inputClass} value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="everyone">Everyone</option>
          {MEMBERS.filter((m) => m.id !== meId).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-mute">Due (optional)</span>
          <input
            type="datetime-local"
            className={inputClass}
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-owe">{error}</p> : null}
        <PrimaryButton onClick={add} disabled={busy || !message.trim()}>
          {busy ? "Sending…" : "Send reminder"}
        </PrimaryButton>
      </Card>

      <div className="space-y-2">
        <Label>Open</Label>
        {open.length === 0 ? (
          <p className="text-sm text-mute">No open reminders.</p>
        ) : (
          open.map((r) => (
            <Card key={r.id} className="space-y-2">
              <p className="font-medium">{r.message}</p>
              <p className="text-xs text-mute">
                {r.fromName} → {r.toName}
                {r.dueAt
                  ? ` · due ${new Date(r.dueAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => act(r.id, "done")}
                  className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Done
                </button>
                {(r.fromId === meId || r.toId === meId) && (
                  <button
                    type="button"
                    onClick={() => act(r.id, "cancel")}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {closed.length > 0 ? (
        <div className="space-y-2">
          <Label>Closed</Label>
          {closed.slice(0, 10).map((r) => (
            <div key={r.id} className="rounded-xl border border-line px-3 py-2 text-sm text-mute">
              <p className={r.status === "done" ? "line-through" : ""}>{r.message}</p>
              <p className="text-xs">
                {r.fromName} → {r.toName} · {r.status}
              </p>
              {r.status === "done" ? (
                <button type="button" onClick={() => act(r.id, "reopen")} className="mt-1 text-xs underline">
                  Reopen
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
