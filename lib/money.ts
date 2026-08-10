export function rupeesToPaise(value: number | string): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function paiseToNumber(paise: number): number {
  return paise / 100;
}

export function formatINR(paise: number, withSign = false): string {
  const sign = withSign ? (paise > 0 ? "+" : paise < 0 ? "−" : "") : "";
  const abs = Math.abs(paise);
  const rupees = (abs / 100).toLocaleString("en-IN", {
    minimumFractionDigits: abs % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${sign}₹${rupees}`;
}

/** Split total paise equally. Remainder paise go to sorted member ids (stable). */
export function splitEqual(totalPaise: number, memberIds: string[]): Record<string, number> {
  const ids = [...new Set(memberIds)].sort();
  if (ids.length === 0) return {};
  const base = Math.floor(totalPaise / ids.length);
  let rem = totalPaise - base * ids.length;
  const out: Record<string, number> = {};
  for (const id of ids) {
    out[id] = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
  }
  return out;
}

export function monthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function monthRange(key: string): { start: Date; end: Date } {
  const [y, m] = key.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, m ?? 1, 1);
  return { start, end };
}
