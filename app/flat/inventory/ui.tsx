"use client";

import { useEffect, useState } from "react";
import { Card, inputClass } from "@/components/ui";

type Item = { id: string; name: string; quantity: string | null; status: string };

export function InventoryClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  async function load() {
    const res = await fetch("/api/inventory", { cache: "no-store" });
    setItems((await res.json()).items ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!name.trim()) return;
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity }),
    });
    setName("");
    setQuantity("");
    await load();
  }

  async function update(id: string, patch: Partial<Item>) {
    await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Inventory</h1>
      <div className="grid grid-cols-[1fr_90px_auto] gap-2">
        <input className={inputClass} placeholder="Item" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputClass} placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <button onClick={add} className="rounded-xl bg-ink px-3 text-sm font-semibold text-white">Add</button>
      </div>
      {items.map((i) => (
        <Card key={i.id} className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">{i.name}</p>
            <input
              className="mt-1 w-32 rounded-lg border border-line bg-paper px-2 py-1 text-sm"
              value={i.quantity ?? ""}
              onChange={(e) => update(i.id, { quantity: e.target.value })}
              placeholder="qty"
            />
          </div>
          <select
            className="rounded-lg border border-line bg-paper px-2 py-1 text-sm"
            value={i.status}
            onChange={(e) => update(i.id, { status: e.target.value })}
          >
            <option value="ok">OK</option>
            <option value="low">Low</option>
            <option value="out">Out</option>
          </select>
        </Card>
      ))}
    </div>
  );
}
