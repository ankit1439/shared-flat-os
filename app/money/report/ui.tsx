"use client";

import { useEffect, useState } from "react";
import { Card, Label } from "@/components/ui";
import { Rupee } from "@/components/Rupee";
import { monthKey, monthLabel } from "@/lib/money";

type Report = {
  month: string;
  totalPaise: number;
  expenseCount: number;
  dailyAvgPaise: number;
  dayOfMonth: number;
  daysInMonth: number;
  byType: Array<{ type: string; label: string; amountPaise: number; count: number; pct: number }>;
  byPayer: Array<{ id: string; short: string; amountPaise: number; count: number; pct: number }>;
  byDay: Array<{ dayKey: string; label: string; amountPaise: number; count: number }>;
  people: Array<{
    id: string;
    short: string;
    paidPaise: number;
    sharePaise: number;
    netPaise: number;
  }>;
  topExpenses: Array<{
    id: string;
    title: string;
    typeLabel: string;
    amountPaise: number;
    paidByName: string;
    createdAt: string;
    notes: string | null;
    itemCount: number;
  }>;
  peakDay: { dayKey: string; label: string; amountPaise: number; count: number } | null;
  biggest: {
    id: string;
    title: string;
    typeLabel: string;
    amountPaise: number;
    paidByName: string;
  } | null;
  insights: {
    topCategory: { label: string; amountPaise: number; pct: number } | null;
    topPayer: { short: string; amountPaise: number; pct: number } | null;
    mostOwed: { short: string; netPaise: number } | null;
    mostAhead: { short: string; netPaise: number } | null;
  };
  settlements: {
    all: Array<{
      id: string;
      status: string;
      amountPaise: number;
      fromName: string;
      toName: string;
      claimedAt: string;
    }>;
    approvedCount: number;
    pendingCount: number;
    settledPaise: number;
    pendingSettlePaise: number;
  };
};

function Bar({ pct }: { pct: number }) {
  return (
    <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
      <span
        className="block h-full rounded-full bg-ink transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </span>
  );
}

export function ReportClient() {
  const [month, setMonth] = useState(monthKey());
  const [data, setData] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`/api/report?month=${month}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, [month]);

  const maxDay = data?.byDay.reduce((m, d) => Math.max(m, d.amountPaise), 0) ?? 0;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Monthly report</h1>
          <p className="text-xs text-mute">Where the flat money went</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-line bg-card px-2 py-1.5 text-sm"
        />
      </div>

      {!data ? (
        <p className="text-sm text-mute">Loading…</p>
      ) : (
        <>
          {/* Hero */}
          <section className="overflow-hidden rounded-3xl border-2 border-ink bg-card px-4 py-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">
              {monthLabel(data.month)}
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">
              <Rupee paise={data.totalPaise} />
            </p>
            <p className="mt-1 text-sm text-mute">
              {data.expenseCount} expense{data.expenseCount === 1 ? "" : "s"} · day {data.dayOfMonth}/
              {data.daysInMonth}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-paper px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">
                  Daily average
                </p>
                <p className="mt-1 text-lg font-semibold">
                  <Rupee paise={data.dailyAvgPaise} />
                </p>
              </div>
              <div className="rounded-2xl bg-paper px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">
                  Biggest bill
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {data.biggest ? <Rupee paise={data.biggest.amountPaise} /> : "—"}
                </p>
                {data.biggest ? (
                  <p className="mt-0.5 truncate text-[11px] text-mute">
                    {data.biggest.title} · {data.biggest.paidByName}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* Story insights */}
          {(data.insights.topCategory || data.insights.topPayer || data.peakDay) && (
            <Card className="space-y-2">
              <Label>This month’s story</Label>
              {data.insights.topCategory ? (
                <p className="text-sm">
                  Most spent on <strong>{data.insights.topCategory.label}</strong> (
                  {data.insights.topCategory.pct}% ·{" "}
                  <Rupee paise={data.insights.topCategory.amountPaise} />)
                </p>
              ) : null}
              {data.insights.topPayer ? (
                <p className="text-sm">
                  <strong>{data.insights.topPayer.short}</strong> paid the most from pocket (
                  {data.insights.topPayer.pct}% · <Rupee paise={data.insights.topPayer.amountPaise} />)
                </p>
              ) : null}
              {data.peakDay ? (
                <p className="text-sm">
                  Peak day <strong>{data.peakDay.label}</strong> —{" "}
                  <Rupee paise={data.peakDay.amountPaise} /> ({data.peakDay.count} entries)
                </p>
              ) : null}
              {data.insights.mostAhead ? (
                <p className="text-sm text-get">
                  {data.insights.mostAhead.short} is ahead by{" "}
                  <Rupee paise={data.insights.mostAhead.netPaise} />
                </p>
              ) : null}
              {data.insights.mostOwed ? (
                <p className="text-sm text-owe">
                  {data.insights.mostOwed.short} still owes the group{" "}
                  <Rupee paise={Math.abs(data.insights.mostOwed.netPaise)} />
                </p>
              ) : null}
            </Card>
          )}

          {/* Where we spend */}
          <Card>
            <Label>Where we spent</Label>
            {data.byType.length === 0 ? (
              <p className="mt-2 text-sm text-mute">No spending this month yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {data.byType.map((t) => (
                  <div key={t.type}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">
                        {t.label}
                        <span className="ml-1 text-xs font-normal text-mute">
                          · {t.count}× · {t.pct}%
                        </span>
                      </span>
                      <Rupee paise={t.amountPaise} className="font-semibold" />
                    </div>
                    <Bar pct={t.pct} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Who paid cash */}
          <Card>
            <Label>Who paid (cash out)</Label>
            {data.byPayer.every((p) => p.amountPaise === 0) ? (
              <p className="mt-2 text-sm text-mute">Nobody paid yet this month.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {data.byPayer
                  .filter((p) => p.amountPaise > 0)
                  .map((p) => (
                    <div key={p.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium">
                          {p.short}
                          <span className="ml-1 text-xs font-normal text-mute">
                            · {p.count} bills · {p.pct}%
                          </span>
                        </span>
                        <Rupee paise={p.amountPaise} className="font-semibold" />
                      </div>
                      <Bar pct={p.pct} />
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {/* Fair share balance */}
          <Card>
            <Label>Fair share balance</Label>
            <p className="mb-3 text-xs text-mute">
              Paid from pocket vs your share of all bills this month.
            </p>
            <div className="space-y-3">
              {data.people.map((p) => (
                <div key={p.id} className="rounded-2xl border border-line px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{p.short}</p>
                    <Rupee paise={p.netPaise} signed className="text-base font-semibold" />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-mute">
                    <p>
                      Paid <Rupee paise={p.paidPaise} className="font-medium text-ink" />
                    </p>
                    <p className="text-right">
                      Share <Rupee paise={p.sharePaise} className="font-medium text-ink" />
                    </p>
                  </div>
                  <p className="mt-2 text-[11px] text-mute">
                    {p.netPaise > 0
                      ? "Group owes them"
                      : p.netPaise < 0
                        ? "They owe the group"
                        : "Settled for this month’s bills"}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Day by day */}
          {data.byDay.length > 0 ? (
            <Card>
              <Label>Day by day</Label>
              <div className="mt-3 flex h-24 items-end gap-1">
                {data.byDay.map((d) => {
                  const h = maxDay > 0 ? Math.max(8, Math.round((d.amountPaise / maxDay) * 100)) : 8;
                  return (
                    <div
                      key={d.dayKey}
                      className="group relative flex flex-1 flex-col items-center justify-end"
                      title={`${d.label}: ₹${(d.amountPaise / 100).toFixed(0)}`}
                    >
                      <span
                        className="w-full rounded-t-md bg-ink/80"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                {[...data.byDay].reverse().map((d) => (
                  <div key={d.dayKey} className="flex justify-between gap-2">
                    <span className="text-mute">
                      {d.label}
                      <span className="ml-1 text-[11px]">· {d.count}</span>
                    </span>
                    <Rupee paise={d.amountPaise} className="font-medium" />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {/* Biggest spends */}
          <Card>
            <Label>Biggest spends</Label>
            {data.topExpenses.length === 0 ? (
              <p className="mt-2 text-sm text-mute">Nothing recorded yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {data.topExpenses.map((e, i) => (
                  <div
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        <span className="mr-1.5 text-mute">{i + 1}.</span>
                        {e.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-mute">
                        {e.typeLabel} · {e.paidByName} ·{" "}
                        {new Date(e.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {e.itemCount ? ` · ${e.itemCount} items` : ""}
                      </p>
                      {e.notes ? <p className="mt-0.5 text-[11px] text-mute">{e.notes}</p> : null}
                    </div>
                    <Rupee paise={e.amountPaise} className="shrink-0 font-semibold" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Settlements */}
          <Card>
            <Label>Settlements this month</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-paper px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-mute">Approved</p>
                <p className="font-semibold">
                  <Rupee paise={data.settlements.settledPaise} />
                </p>
                <p className="text-[11px] text-mute">{data.settlements.approvedCount} transfers</p>
              </div>
              <div className="rounded-xl bg-paper px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-mute">Waiting</p>
                <p className="font-semibold">
                  <Rupee paise={data.settlements.pendingSettlePaise} />
                </p>
                <p className="text-[11px] text-mute">{data.settlements.pendingCount} claims</p>
              </div>
            </div>
            {data.settlements.all.length === 0 ? (
              <p className="mt-3 text-sm text-mute">No settlement claims this month.</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                {data.settlements.all.map((s) => (
                  <p key={s.id} className="flex justify-between gap-2 border-b border-line pb-2 last:border-0">
                    <span>
                      {s.fromName} → {s.toName}
                      <span className="ml-1 text-[11px] text-mute">{s.status}</span>
                    </span>
                    <Rupee paise={s.amountPaise} className="font-medium" />
                  </p>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
