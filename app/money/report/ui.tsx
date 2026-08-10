"use client";

import { useEffect, useState } from "react";
import { Card, Label } from "@/components/ui";
import { Rupee } from "@/components/Rupee";
import { monthKey, monthLabel } from "@/lib/money";

type Report = {
  month: string;
  totalPaise: number;
  expenseCount: number;
  byType: Array<{ type: string; label: string; amountPaise: number }>;
  people: Array<{ id: string; short: string; paidPaise: number; sharePaise: number; netPaise: number }>;
  settlements: Array<{
    id: string;
    status: string;
    amountPaise: number;
    from: { name: string };
    to: { name: string };
  }>;
};

export function ReportClient() {
  const [month, setMonth] = useState(monthKey());
  const [data, setData] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`/api/report?month=${month}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, [month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Monthly report</h1>
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
          <Card>
            <Label>{monthLabel(data.month)}</Label>
            <p className="text-3xl font-semibold">
              <Rupee paise={data.totalPaise} />
            </p>
            <p className="text-sm text-mute">{data.expenseCount} entries</p>
          </Card>

          <Card>
            <Label>By type</Label>
            {data.byType.length === 0 ? (
              <p className="text-sm text-mute">No spending this month.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {data.byType.map((t) => (
                  <div key={t.type} className="flex justify-between">
                    <span>{t.label}</span>
                    <Rupee paise={t.amountPaise} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <Label>Each person</Label>
            <div className="space-y-3 text-sm">
              {data.people.map((p) => (
                <div key={p.id} className="rounded-xl border border-line p-3">
                  <div className="flex justify-between font-medium">
                    <span>{p.short}</span>
                    <Rupee paise={p.netPaise} signed />
                  </div>
                  <p className="mt-1 text-xs text-mute">
                    Paid <Rupee paise={p.paidPaise} /> · Share <Rupee paise={p.sharePaise} />
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Label>Settlements</Label>
            {data.settlements.length === 0 ? (
              <p className="text-sm text-mute">None this month.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {data.settlements.map((s) => (
                  <p key={s.id}>
                    {s.from.name.split(" ")[0]} → {s.to.name.split(" ")[0]}{" "}
                    <Rupee paise={s.amountPaise} /> · {s.status}
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
