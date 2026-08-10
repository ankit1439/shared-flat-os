"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, Label } from "@/components/ui";
import { Rupee } from "@/components/Rupee";
import { ClientOnly } from "@/components/ClientOnly";
import { EXPENSE_TYPES } from "@/lib/types";
import { MEMBERS, shortName } from "@/lib/members";
import { monthKey } from "@/lib/money";

type ShareMatrixCell = {
  memberId: string;
  memberName: string;
  sharePaise: number;
  shareLabel: string;
  included: boolean;
};

type Row = {
  id: string;
  kind: "expense" | "settlement";
  at: string;
  dayKey: string;
  date: string;
  weekday: string;
  time: string;
  type: string;
  typeLabel: string;
  title: string;
  items: string;
  itemLines: string[];
  amountPaise: number;
  amountLabel: string;
  paidById: string;
  paidByName: string;
  splitMethod: string;
  shareMatrix: ShareMatrixCell[];
  sharesSummary: string;
  notes: string;
  status: string;
  toId?: string;
  toName?: string;
};

type Summary = {
  count: number;
  expenseCount: number;
  settlementCount: number;
  pendingCount: number;
  totalPaise: number;
  pendingPaise: number;
  approvedPaise: number;
  byType: Array<{ type: string; label: string; count: number; amountPaise: number }>;
  byPayer: Array<{ memberId: string; name: string; count: number; amountPaise: number }>;
};

type Balances = {
  mine: { owePaise: number; receivePaise: number; netPaise: number };
  people: Array<{ id: string; short: string; netPaise: number }>;
  suggestions: Array<{ fromId: string; toId: string; amountPaise: number }>;
};

function splitLabel(method: string) {
  if (method === "everyone") return "Equal · everyone";
  if (method === "selected") return "Equal · selected";
  if (method === "custom") return "custom amounts";
  if (method === "settlement") return "debt payment";
  return method;
}

function statusLabel(status: string) {
  if (status === "claimed") return "Waiting approval";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "recorded") return "Recorded";
  return status;
}

function chipClass(active: boolean) {
  return active
    ? "rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"
    : "rounded-full border border-line bg-card px-3 py-1.5 text-xs text-mute";
}

export function MoneyClient({ meId }: { meId: string }) {
  const [tab, setTab] = useState<"list" | "balances" | "settle">("list");
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [type, setType] = useState("all");
  const [member, setMember] = useState("all");
  const [month, setMonth] = useState("all");
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    const qs = new URLSearchParams({ type, member, month, sort, q: qDebounced });
    const [m, b] = await Promise.all([
      fetch(`/api/master?${qs}`, { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/balances", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setRows(m.rows ?? []);
    setSummary(m.summary ?? null);
    setBalances(b);
  }

  useEffect(() => {
    load();
  }, [type, member, month, sort, qDebounced]);

  return (
    <ClientOnly
      fallback={
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Money</h1>
              <p className="text-xs text-mute">Ledger · balances · settlements</p>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-card px-4 py-8 text-sm text-mute">
            Loading money…
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Money</h1>
            <p className="text-xs text-mute">Ledger · balances · settlements</p>
          </div>
          <Link
            href="/money/add"
            className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-white"
          >
            + Add
          </Link>
        </div>

        <div className="grid grid-cols-3 rounded-xl border border-line bg-card p-1 text-sm">
          {(["list", "balances", "settle"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg py-2 ${tab === id ? "bg-ink font-semibold text-white" : "text-mute"}`}
            >
              {id === "list" ? "Ledger" : id === "balances" ? "Balances" : "Settle"}
            </button>
          ))}
        </div>

        {tab === "list" ? (
          <MasterLedger
            rows={rows}
            summary={summary}
            type={type}
            member={member}
            month={month}
            sort={sort}
            q={q}
            onType={setType}
            onMember={setMember}
            onMonth={setMonth}
            onSort={setSort}
            onQ={setQ}
          />
        ) : null}
        {tab === "balances" && balances ? <BalancesView data={balances} /> : null}
        {tab === "settle" ? <SettleView meId={meId} onDone={load} /> : null}

        <Link href="/money/report" className="block text-center text-sm text-mute underline">
          Monthly report →
        </Link>
      </div>
    </ClientOnly>
  );
}

function MasterLedger({
  rows,
  summary,
  type,
  member,
  month,
  sort,
  q,
  onType,
  onMember,
  onMonth,
  onSort,
  onQ,
}: {
  rows: Row[];
  summary: Summary | null;
  type: string;
  member: string;
  month: string;
  sort: string;
  q: string;
  onType: (v: string) => void;
  onMember: (v: string) => void;
  onMonth: (v: string) => void;
  onSort: (v: string) => void;
  onQ: (v: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, { dayKey: string; date: string; weekday: string; rows: Row[]; spentPaise: number }>();
    for (const row of rows) {
      const existing = map.get(row.dayKey);
      if (existing) {
        existing.rows.push(row);
        if (row.kind === "expense") existing.spentPaise += row.amountPaise;
      } else {
        map.set(row.dayKey, {
          dayKey: row.dayKey,
          date: row.date,
          weekday: row.weekday,
          rows: [row],
          spentPaise: row.kind === "expense" ? row.amountPaise : 0,
        });
      }
    }
    return Array.from(map.values());
  }, [rows]);

  return (
    <div className="space-y-3">
      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Entries" value={String(summary?.count ?? 0)} />
        <Metric label="Spent" value={<Rupee paise={summary?.totalPaise ?? 0} />} />
        <Metric label="Expenses" value={String(summary?.expenseCount ?? 0)} />
        <Metric
          label="Waiting"
          value={
            summary?.pendingCount
              ? `${summary.pendingCount} · ${formatQuick(summary.pendingPaise)}`
              : "0"
          }
          warn={!!summary?.pendingCount}
        />
      </div>

      {/* Search + sort */}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Search title, items, person, notes…"
          className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-ink"
        />
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          className="rounded-xl border border-line bg-card px-3 py-2.5 text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount_high">Amount high → low</option>
          <option value="amount_low">Amount low → high</option>
        </select>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" className={chipClass(type === "all")} onClick={() => onType("all")}>
            All types
          </button>
          {EXPENSE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={chipClass(type === t.id)}
              onClick={() => onType(t.id)}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className={chipClass(type === "settlement")}
            onClick={() => onType("settlement")}
          >
            Settlements
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" className={chipClass(member === "all")} onClick={() => onMember("all")}>
            Everyone
          </button>
          {MEMBERS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={chipClass(member === m.id)}
              onClick={() => onMember(m.id)}
            >
              {m.short}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" className={chipClass(month === "all")} onClick={() => onMonth("all")}>
            All time
          </button>
          <button
            type="button"
            className={chipClass(month === monthKey())}
            onClick={() => onMonth(monthKey())}
          >
            This month
          </button>
          <button
            type="button"
            className={chipClass(
              month ===
                monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)),
            )}
            onClick={() =>
              onMonth(monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)))
            }
          >
            Last month
          </button>
        </div>
      </div>

      {/* Breakdown strips */}
      {summary && summary.byType.length > 0 ? (
        <Card className="p-3">
          <Label>Spend by type</Label>
          <div className="mt-1 space-y-1.5">
            {summary.byType.map((t) => {
              const pct = summary.totalPaise > 0 ? Math.round((t.amountPaise / summary.totalPaise) * 100) : 0;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => onType(t.type)}
                  className="grid w-full grid-cols-[88px_1fr_72px] items-center gap-2 text-left text-xs"
                >
                  <span className="truncate font-medium">{t.label}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="text-right tabular-nums">
                    <Rupee paise={t.amountPaise} />
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {summary && summary.byPayer.length > 0 ? (
        <Card className="p-3">
          <Label>Who paid (cash out)</Label>
          <div className="mt-1 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {summary.byPayer.map((p) => (
              <button
                key={p.memberId}
                type="button"
                onClick={() => onMember(p.memberId)}
                className="rounded-xl border border-line px-2 py-2 text-left"
              >
                <p className="font-semibold">{p.name}</p>
                <p className="tabular-nums">
                  <Rupee paise={p.amountPaise} />
                </p>
                <p className="text-mute">{p.count} entries</p>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Day-grouped ledger */}
      {rows.length === 0 ? (
        <Card>
          <p className="font-medium">Ledger is empty</p>
          <p className="mt-1 text-sm text-mute">
            Every milk, vegetable, grocery, bill and settlement will appear here — grouped by day, with exact shares.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.dayKey} className="space-y-2">
              <div className="sticky top-[52px] z-10 flex items-end justify-between border-b border-ink/20 bg-paper/95 py-2 backdrop-blur">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">
                    {group.weekday}
                  </p>
                  <p className="text-sm font-semibold">{group.date}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-mute">{group.rows.length} entries</p>
                  <p className="font-semibold tabular-nums">
                    Day spend <Rupee paise={group.spentPaise} />
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {group.rows.map((row, idx) => {
                  const open = openId === `${row.kind}-${row.id}`;
                  return (
                    <article
                      key={`${row.kind}-${row.id}`}
                      className={`overflow-hidden rounded-2xl border ${
                        row.kind === "settlement" ? "border-wait/40 bg-[#fbf6ea]" : "border-line bg-card"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : `${row.kind}-${row.id}`)}
                        className="w-full px-3 py-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                {row.typeLabel}
                              </span>
                              <span className="text-[11px] text-mute">{row.time}</span>
                              <span
                                className={`text-[11px] font-medium ${
                                  row.status === "approved"
                                    ? "text-get"
                                    : row.status === "claimed"
                                      ? "text-wait"
                                      : row.status === "rejected"
                                        ? "text-owe"
                                        : "text-mute"
                                }`}
                              >
                                {statusLabel(row.status)}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[15px] font-semibold leading-tight">
                              {row.title}
                            </p>
                            <p className="mt-0.5 text-xs text-mute">
                              {row.kind === "expense"
                                ? `Paid by ${row.paidByName} · ${splitLabel(row.splitMethod)}`
                                : `${row.paidByName} paid ${row.toName}`}
                            </p>
                            {row.itemLines?.length ? (
                              <p className="mt-1 line-clamp-1 text-xs text-mute">
                                {row.itemLines.join(" · ")}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-base font-semibold tabular-nums">
                              <Rupee paise={row.amountPaise} />
                            </p>
                            <p className="text-[11px] text-mute">{open ? "Hide detail" : "Open detail"}</p>
                          </div>
                        </div>
                      </button>

                      {open ? (
                        <div className="border-t border-line px-3 py-3">
                          {row.kind === "expense" ? (
                            <>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
                                Exact shares
                              </p>
                              <div className="overflow-hidden rounded-xl border border-line">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-paper text-left text-[11px] text-mute">
                                      <th className="px-3 py-2 font-medium">Person</th>
                                      <th className="px-3 py-2 font-medium">In split?</th>
                                      <th className="px-3 py-2 text-right font-medium">Share</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.shareMatrix.map((cell) => (
                                      <tr key={cell.memberId} className="border-t border-line">
                                        <td className="px-3 py-2 font-medium">{cell.memberName}</td>
                                        <td className="px-3 py-2 text-mute">
                                          {cell.included ? "Yes" : "No"}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                          {cell.included ? cell.shareLabel : "₹0"}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="border-t border-ink/20 bg-paper">
                                      <td className="px-3 py-2 font-semibold" colSpan={2}>
                                        Total
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                        {row.amountLabel}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-xl border border-line bg-paper px-3 py-3 text-sm">
                              <p>
                                <span className="text-mute">From</span> {row.paidByName}
                              </p>
                              <p>
                                <span className="text-mute">To</span> {row.toName}
                              </p>
                              <p>
                                <span className="text-mute">Amount</span> {row.amountLabel}
                              </p>
                              <p>
                                <span className="text-mute">Status</span> {statusLabel(row.status)}
                              </p>
                            </div>
                          )}

                          {row.itemLines?.length ? (
                            <div className="mt-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
                                Items
                              </p>
                              <ul className="space-y-1 text-sm">
                                {row.itemLines.map((line) => (
                                  <li key={line} className="flex gap-2">
                                    <span className="text-mute">•</span>
                                    <span>{line}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {row.notes ? (
                            <div className="mt-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
                                Notes
                              </p>
                              <p className="text-sm">{row.notes}</p>
                            </div>
                          ) : null}

                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-mute">
                            <p>#{idx + 1} in day</p>
                            <p className="text-right">{row.dayKey}</p>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: ReactNode;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mute">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${warn ? "text-wait" : ""}`}>{value}</p>
    </div>
  );
}

function formatQuick(paise: number) {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function BalancesView({ data }: { data: Balances }) {
  return (
    <div className="space-y-3">
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
      <Card>
        <Label>Net position</Label>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper text-left text-[11px] text-mute">
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 text-right font-medium">Net</th>
                <th className="px-3 py-2 text-right font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {data.people.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-3 py-2 font-medium">{p.short}</td>
                  <td className="px-3 py-2 text-right">
                    <Rupee paise={p.netPaise} signed />
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-mute">
                    {p.netPaise > 0 ? "Should receive" : p.netPaise < 0 ? "Should pay" : "Even"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <Label>Suggested payments</Label>
        {data.suggestions.length === 0 ? (
          <p className="text-sm text-mute">All settled.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper text-left text-[11px] text-mute">
                  <th className="px-3 py-2 font-medium">From</th>
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.suggestions.map((s, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2">{shortName(s.fromId)}</td>
                    <td className="px-3 py-2">{shortName(s.toId)}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      <Rupee paise={s.amountPaise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SettleView({ meId, onDone }: { meId: string; onDone: () => void }) {
  const others = useMemo(() => MEMBERS.filter((m) => m.id !== meId), [meId]);
  const [toId, setToId] = useState<string>(others[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [list, setList] = useState<
    Array<{
      id: string;
      fromId: string;
      toId: string;
      amountPaise: number;
      status: string;
      note: string | null;
      claimedAt: string;
      from: { name: string };
      to: { name: string };
    }>
  >([]);

  async function loadSettlements() {
    const res = await fetch("/api/settlements", { cache: "no-store" });
    const json = await res.json();
    setList(json.settlements ?? []);
  }

  useEffect(() => {
    loadSettlements();
  }, []);

  async function claim() {
    setMsg("");
    const res = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toId, amountRupees: amount, note }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || "Could not save");
      return;
    }
    setAmount("");
    setNote("");
    setMsg("Sent. Waiting for them to approve.");
    await loadSettlements();
    onDone();
  }

  async function decide(id: string, action: "approve" | "reject") {
    await fetch(`/api/settlements/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await loadSettlements();
    onDone();
  }

  const waitingOnMe = list.filter((s) => s.status === "claimed" && s.toId === meId);

  return (
    <div className="space-y-3">
      <Card>
        <Label>I paid my debt</Label>
        <div className="space-y-3">
          <select
            className="w-full rounded-xl border border-line bg-paper px-3 py-2.5"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
          >
            {others.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            inputMode="decimal"
            placeholder="Amount ₹"
            className="w-full rounded-xl border border-line bg-paper px-3 py-2.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            placeholder="Note (UPI / cash)"
            className="w-full rounded-xl border border-line bg-paper px-3 py-2.5"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button onClick={claim} className="w-full rounded-xl bg-ink py-3 text-sm font-semibold text-white">
            Tell them I paid
          </button>
          {msg ? <p className="text-sm text-mute">{msg}</p> : null}
        </div>
      </Card>

      {waitingOnMe.length > 0 ? (
        <Card>
          <Label>Approve incoming</Label>
          <div className="space-y-3">
            {waitingOnMe.map((s) => (
              <div key={s.id} className="rounded-xl border border-line p-3 text-sm">
                <p>
                  {s.from.name.split(" ")[0]} paid you <Rupee paise={s.amountPaise} />
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => decide(s.id, "approve")}
                    className="flex-1 rounded-lg bg-home py-2 font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide(s.id, "reject")}
                    className="flex-1 rounded-lg border border-line py-2"
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
        <Label>Settlement register</Label>
        {list.length === 0 ? (
          <p className="text-sm text-mute">None yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper text-left text-[11px] text-mute">
                  <th className="px-2 py-2 font-medium">From</th>
                  <th className="px-2 py-2 font-medium">To</th>
                  <th className="px-2 py-2 text-right font-medium">Amt</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-2 py-2">{s.from.name.split(" ")[0]}</td>
                    <td className="px-2 py-2">{s.to.name.split(" ")[0]}</td>
                    <td className="px-2 py-2 text-right">
                      <Rupee paise={s.amountPaise} />
                    </td>
                    <td className="px-2 py-2">{statusLabel(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
