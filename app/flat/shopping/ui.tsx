"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton, inputClass } from "@/components/ui";
import { Rupee } from "@/components/Rupee";

type Item = {
  id: string;
  name: string;
  status: string;
  amountPaise: number | null;
  addedBy: { name: string };
  purchasedBy: { name: string } | null;
};

export function ShoppingClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [buyId, setBuyId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [asExpense, setAsExpense] = useState(true);

  async function load() {
    const res = await fetch("/api/shopping", { cache: "no-store" });
    const json = await res.json();
    setItems(json.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name.trim()) return;
    await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    await load();
  }

  async function buy(id: string) {
    await fetch("/api/shopping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        action: "buy",
        amountRupees: amount || undefined,
        createExpense: asExpense,
      }),
    });
    setBuyId(null);
    setAmount("");
    await load();
  }

  const needed = items.filter((i) => i.status === "needed");
  const done = items.filter((i) => i.status !== "needed");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Shopping</h1>
      <div className="flex gap-2">
        <input className={inputClass} placeholder="Milk, eggs…" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={add} className="rounded-xl bg-ink px-4 text-sm font-semibold text-white">Add</button>
      </div>

      {needed.map((i) => (
        <Card key={i.id}>
          <p className="font-medium">{i.name}</p>
          <p className="text-xs text-mute">Added by {i.addedBy.name.split(" ")[0]}</p>
          {buyId === i.id ? (
            <div className="mt-3 space-y-2">
              <input className={inputClass} inputMode="decimal" placeholder="Price ₹ (optional)" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={asExpense} onChange={(e) => setAsExpense(e.target.checked)} />
                Also add as shared expense
              </label>
              <PrimaryButton onClick={() => buy(i.id)}>Mark purchased</PrimaryButton>
            </div>
          ) : (
            <button onClick={() => setBuyId(i.id)} className="mt-2 text-sm underline">Purchased</button>
          )}
        </Card>
      ))}

      {done.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-mute">Done</p>
          {done.map((i) => (
            <p key={i.id} className="text-sm text-mute">
              {i.name}
              {i.amountPaise ? <> · <Rupee paise={i.amountPaise} /></> : null}
              {i.purchasedBy ? ` · ${i.purchasedBy.name.split(" ")[0]}` : ""} · {i.status}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
