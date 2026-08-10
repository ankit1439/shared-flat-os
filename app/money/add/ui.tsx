"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { EXPENSE_TYPES } from "@/lib/types";
import { MEMBERS } from "@/lib/members";
import { Field, PrimaryButton, inputClass } from "@/components/ui";

function FormInner({ meId }: { meId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("type") || "vegetables";
  const [type, setType] = useState(preset);
  const [title, setTitle] = useState(
    preset === "vegetables" ? "Vegetables" : preset === "milk" ? "Milk" : "",
  );
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(meId);
  const [split, setSplit] = useState<"everyone" | "selected" | "custom">("everyone");
  const [selected, setSelected] = useState<string[]>(MEMBERS.map((m) => m.id));
  const [custom, setCustom] = useState<Record<string, string>>(
    Object.fromEntries(MEMBERS.map((m) => [m.id, ""])),
  );
  const [lines, setLines] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const showLines = type === "vegetables" || type === "groceries";

  const defaultTitle = useMemo(() => {
    const t = EXPENSE_TYPES.find((x) => x.id === type);
    return t?.label ?? "";
  }, [type]);

  async function save() {
    setError("");
    setBusy(true);
    const payload = {
      type,
      title: title.trim() || defaultTitle,
      amountRupees: amount,
      paidById,
      split,
      memberIds: selected,
      customShares: custom,
      notes,
      lines: showLines
        ? lines
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((name) => ({ name }))
        : undefined,
    };
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not save");
      return;
    }
    router.push("/money");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Add</h1>

      <div className="flex flex-wrap gap-2">
        {EXPENSE_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setType(t.id);
              if (!title || title === defaultTitle) setTitle(t.label);
            }}
            className={`rounded-full px-3 py-1.5 text-sm ${
              type === t.id ? "bg-ink text-white" : "border border-line bg-card"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Field label="Amount ₹">
        <input
          inputMode="decimal"
          autoFocus
          className={inputClass}
          placeholder="180"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      <Field label="What">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      {showLines ? (
        <Field label="Items (optional, comma separated)">
          <input
            className={inputClass}
            placeholder="Tomato, bhindi, onion"
            value={lines}
            onChange={(e) => setLines(e.target.value)}
          />
        </Field>
      ) : null}

      {type === "milk" ? (
        <p className="text-xs text-mute">Split uses only people who drink milk, unless you change split below.</p>
      ) : null}

      <Field label="Paid by">
        <select className={inputClass} value={paidById} onChange={(e) => setPaidById(e.target.value)}>
          {MEMBERS.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Split">
        <select className={inputClass} value={split} onChange={(e) => setSplit(e.target.value as typeof split)}>
          <option value="everyone">Everyone</option>
          <option value="selected">Selected people</option>
          <option value="custom">Custom amounts</option>
        </select>
      </Field>

      {split === "selected" ? (
        <div className="space-y-2 rounded-2xl border border-line bg-card p-3">
          {MEMBERS.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(m.id)}
                onChange={(e) => {
                  setSelected((prev) =>
                    e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                  );
                }}
              />
              {m.name}
            </label>
          ))}
        </div>
      ) : null}

      {split === "custom" ? (
        <div className="space-y-2 rounded-2xl border border-line bg-card p-3">
          {MEMBERS.map((m) => (
            <label key={m.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{m.short}</span>
              <input
                inputMode="decimal"
                className="w-28 rounded-lg border border-line bg-paper px-2 py-1.5"
                placeholder="₹"
                value={custom[m.id]}
                onChange={(e) => setCustom((c) => ({ ...c, [m.id]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      ) : null}

      <Field label="Note (optional)">
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {error ? <p className="text-sm text-owe">{error}</p> : null}
      <PrimaryButton onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </PrimaryButton>
    </div>
  );
}

export function AddExpenseForm({ meId }: { meId: string }) {
  return (
    <Suspense fallback={<p className="text-sm text-mute">Loading…</p>}>
      <FormInner meId={meId} />
    </Suspense>
  );
}
