"use client";

import { useEffect, useState } from "react";
import { Field, PrimaryButton, inputClass } from "@/components/ui";

type Info = {
  name: string;
  address: string | null;
  ownerName: string | null;
  ownerContact: string | null;
  wifiSsid: string | null;
  wifiPassword: string | null;
  notes: string | null;
};

export function InfoClient() {
  const [info, setInfo] = useState<Info>({
    name: "Our Flat",
    address: "",
    ownerName: "",
    ownerContact: "",
    wifiSsid: "",
    wifiPassword: "",
    notes: "",
  });
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/flat", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.info) {
          setInfo({
            name: j.info.name ?? "Our Flat",
            address: j.info.address ?? "",
            ownerName: j.info.ownerName ?? "",
            ownerContact: j.info.ownerContact ?? "",
            wifiSsid: j.info.wifiSsid ?? "",
            wifiPassword: j.info.wifiPassword ?? "",
            notes: j.info.notes ?? "",
          });
        }
      });
  }, []);

  async function save() {
    await fetch("/api/flat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(info),
    });
    setSaved("Saved");
    setTimeout(() => setSaved(""), 1500);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Flat info</h1>
      <Field label="Name">
        <input className={inputClass} value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
      </Field>
      <Field label="Address">
        <input className={inputClass} value={info.address ?? ""} onChange={(e) => setInfo({ ...info, address: e.target.value })} />
      </Field>
      <Field label="Owner">
        <input className={inputClass} value={info.ownerName ?? ""} onChange={(e) => setInfo({ ...info, ownerName: e.target.value })} />
      </Field>
      <Field label="Owner contact">
        <input className={inputClass} value={info.ownerContact ?? ""} onChange={(e) => setInfo({ ...info, ownerContact: e.target.value })} />
      </Field>
      <Field label="Wi-Fi name">
        <input className={inputClass} value={info.wifiSsid ?? ""} onChange={(e) => setInfo({ ...info, wifiSsid: e.target.value })} />
      </Field>
      <Field label="Wi-Fi password">
        <input className={inputClass} value={info.wifiPassword ?? ""} onChange={(e) => setInfo({ ...info, wifiPassword: e.target.value })} />
      </Field>
      <Field label="Notes">
        <input className={inputClass} value={info.notes ?? ""} onChange={(e) => setInfo({ ...info, notes: e.target.value })} />
      </Field>
      <PrimaryButton onClick={save}>{saved || "Save"}</PrimaryButton>
    </div>
  );
}
