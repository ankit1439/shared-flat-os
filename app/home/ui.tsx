"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Label, inputClass } from "@/components/ui";
import { Rupee } from "@/components/Rupee";
import { typeLabel } from "@/lib/types";

type HomeData = {
  who: { id: string; short: string };
  mine: { owePaise: number; receivePaise: number };
  people: Array<{ id: string; short: string; presence: string }>;
  homeCount: number;
  pendingForMe: Array<{ id: string; fromName: string; amountPaise: number; note: string | null }>;
  shoppingCount: number;
  inventory: Array<{ id: string; name: string; quantity: string | null; status: string }>;
  myChore: { title: string } | null;
  recent: Array<{
    id: string;
    title: string;
    type: string;
    amountPaise: number;
    createdAt: string;
    paidBy: { name: string };
  }>;
  importantNote: {
    body: string;
    updatedAt: string;
    updatedByName: string | null;
  };
  reminders: Array<{
    id: string;
    message: string;
    fromName: string;
    toName: string;
    forMe: boolean;
    dueAt: string | null;
  }>;
  unreadCount: number;
};

function presenceDot(state: string) {
  if (state === "at_flat") return "bg-home";
  if (state === "away") return "bg-line";
  return "bg-wait";
}

function presenceLabel(state: string) {
  if (state === "at_flat") return "At flat";
  if (state === "away") return "Away";
  return "Unknown";
}

export function HomeClient() {
  const [data, setData] = useState<HomeData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function load() {
    const res = await fetch("/api/home", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setData(json);
      if (!editingNote) setNoteDraft(json.importantNote?.body ?? "");
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    await fetch(`/api/settlements/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setBusyId(null);
  }

  async function setMine(state: "at_flat" | "away") {
    await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, source: "manual" }),
    });
    await load();
  }

  async function saveNote() {
    setSavingNote(true);
    await fetch("/api/note", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteDraft }),
    });
    setSavingNote(false);
    setEditingNote(false);
    await load();
  }

  async function doneReminder(id: string) {
    await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "done" }),
    });
    await load();
  }

  if (!data) return <p className="text-sm text-mute">Loading the flat…</p>;

  const note = data.importantNote ?? { body: "", updatedAt: "", updatedByName: null };
  const reminders = data.reminders ?? [];
  const milk = data.inventory.find((i) => i.name.toLowerCase() === "milk");
  const veg = data.inventory.find((i) => i.name.toLowerCase().includes("veg"));
  const forMe = reminders.filter((r) => r.forMe);

  return (
    <div className="space-y-4">
      {/* Important note — center front */}
      <section className="rounded-3xl border-2 border-ink bg-card px-4 py-5 text-center shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">
          Important note
        </p>
        {editingNote ? (
          <div className="mt-3 space-y-3 text-left">
            <textarea
              className={`${inputClass} min-h-[96px]`}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Owner visiting tomorrow… Wi-Fi password changed… Gas coming at 5…"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={savingNote}
                onClick={saveNote}
                className="flex-1 rounded-xl bg-ink py-2.5 text-sm font-semibold text-white"
              >
                {savingNote ? "Saving…" : "Save for everyone"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingNote(false);
                  setNoteDraft(note.body);
                }}
                className="rounded-xl border border-line px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {note.body ? (
              <p className="mt-3 text-lg font-semibold leading-snug">{note.body}</p>
            ) : (
              <p className="mt-3 text-sm text-mute">
                Nothing pinned yet. Add one note everyone must see.
              </p>
            )}
            <p className="mt-2 text-[11px] text-mute">
              {note.updatedByName
                ? `Updated by ${note.updatedByName}`
                : "Visible to all four"}
            </p>
            <button
              type="button"
              onClick={() => {
                setNoteDraft(note.body);
                setEditingNote(true);
              }}
              className="mt-3 rounded-full border border-line px-4 py-1.5 text-xs font-semibold"
            >
              {note.body ? "Edit note" : "Add important note"}
            </button>
          </>
        )}
      </section>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <Label>Reminders</Label>
          <Link href="/flat/reminders" className="text-xs font-semibold underline">
            + Tell someone
          </Link>
        </div>
        {forMe.length === 0 ? (
          <p className="text-sm text-mute">No open reminders for you.</p>
        ) : (
          <div className="space-y-2">
            {forMe.slice(0, 4).map((r) => (
              <div key={r.id} className="rounded-xl border border-line px-3 py-2.5">
                <p className="text-sm font-medium">{r.message}</p>
                <p className="mt-0.5 text-xs text-mute">
                  From {r.fromName} · to {r.toName}
                </p>
                <button
                  type="button"
                  onClick={() => doneReminder(r.id)}
                  className="mt-2 text-xs font-semibold underline"
                >
                  Mark done
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <Label>Flat status</Label>
        <p className="text-2xl font-semibold">{data.homeCount} / 4 home</p>
        <div className="mt-3 space-y-2">
          {data.people.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${presenceDot(p.presence)}`} />
                {p.short}
              </span>
              <span className="text-mute">{presenceLabel(p.presence)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMine("at_flat")}
            className="flex-1 rounded-xl border border-line py-2 text-sm"
          >
            I’m home
          </button>
          <button
            type="button"
            onClick={() => setMine("away")}
            className="flex-1 rounded-xl border border-line py-2 text-sm"
          >
            I’m out
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <Label>You owe</Label>
          <p className="text-xl font-semibold text-owe">
            <Rupee paise={data.mine.owePaise} />
          </p>
        </Card>
        <Card>
          <Label>You receive</Label>
          <p className="text-xl font-semibold text-get">
            <Rupee paise={data.mine.receivePaise} />
          </p>
        </Card>
      </div>

      {data.pendingForMe.length > 0 ? (
        <Card>
          <Label>Waiting for you</Label>
          <div className="space-y-3">
            {data.pendingForMe.map((s) => (
              <div key={s.id} className="rounded-xl border border-line p-3">
                <p className="text-sm">
                  <strong>{s.fromName}</strong> says he paid you{" "}
                  <Rupee paise={s.amountPaise} />
                </p>
                {s.note ? <p className="text-xs text-mute">{s.note}</p> : null}
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={busyId === s.id}
                    onClick={() => decide(s.id, "approve")}
                    className="flex-1 rounded-lg bg-home px-3 py-2 text-sm font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === s.id}
                    onClick={() => decide(s.id, "reject")}
                    className="flex-1 rounded-lg border border-line px-3 py-2 text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <Label>Supplies</Label>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p>Milk: {milk ? milk.quantity || milk.status : "Not tracked yet"}</p>
          <p>Veg: {veg ? veg.quantity || veg.status : "Not tracked yet"}</p>
          <p>Shopping: {data.shoppingCount} needed</p>
          <p>Chore: {data.myChore?.title || "None set"}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/money/add?type=vegetables"
          className="rounded-2xl bg-ink px-4 py-3 text-center text-sm font-semibold text-white"
        >
          + Vegetables
        </Link>
        <Link
          href="/money/add?type=milk"
          className="rounded-2xl border border-ink px-4 py-3 text-center text-sm font-semibold"
        >
          + Milk
        </Link>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <Label>Latest</Label>
          <Link href="/money" className="text-xs text-mute underline">
            Ledger
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <p className="text-sm text-mute">Nothing added yet.</p>
        ) : (
          <div className="space-y-2">
            {data.recent.map((r) => (
              <div key={r.id} className="flex items-baseline justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-mute">
                    {typeLabel(r.type)} · {r.paidBy.name.split(" ")[0]}
                  </p>
                </div>
                <Rupee paise={r.amountPaise} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
