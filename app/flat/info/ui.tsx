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
  latitude?: number | null;
  longitude?: number | null;
  locationRadiusM?: number | null;
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
    latitude: null,
    longitude: null,
    locationRadiusM: 250,
  });
  const [saved, setSaved] = useState("");
  const [locMsg, setLocMsg] = useState("");
  const [locBusy, setLocBusy] = useState(false);

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
            latitude: j.info.latitude ?? null,
            longitude: j.info.longitude ?? null,
            locationRadiusM: j.info.locationRadiusM ?? 250,
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

  function useMyLocationAsFlat() {
    setLocMsg("");
    if (!navigator.geolocation) {
      setLocMsg("GPS not available on this device.");
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = {
          ...info,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          locationRadiusM: info.locationRadiusM ?? 250,
        };
        setInfo(next);
        await fetch("/api/flat", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: next.latitude,
            longitude: next.longitude,
            locationRadiusM: next.locationRadiusM,
          }),
        });
        setLocBusy(false);
        setLocMsg(
          `Flat pin saved (±${next.locationRadiusM}m). Others can tap “Check in with location” on Home.`,
        );
      },
      (err) => {
        setLocBusy(false);
        setLocMsg(err.message || "Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Flat info</h1>

      <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Flat location (for GPS check-in)</p>
        <p className="text-xs text-mute">
          Stand at the flat once and save the pin. Then Home → “Check in with location” marks you
          home if you’re within the radius.
        </p>
        <p className="text-xs text-mute">
          {info.latitude != null && info.longitude != null
            ? `Saved: ${info.latitude.toFixed(5)}, ${info.longitude.toFixed(5)} · radius ${info.locationRadiusM ?? 250}m`
            : "Not set yet."}
        </p>
        <Field label="Radius (meters)">
          <input
            className={inputClass}
            inputMode="numeric"
            value={info.locationRadiusM ?? 250}
            onChange={(e) =>
              setInfo({ ...info, locationRadiusM: Number(e.target.value) || 250 })
            }
          />
        </Field>
        <button
          type="button"
          disabled={locBusy}
          onClick={useMyLocationAsFlat}
          className="w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {locBusy ? "Reading GPS…" : "Use my location as flat"}
        </button>
        {locMsg ? <p className="text-xs text-mute">{locMsg}</p> : null}
      </div>

      <Field label="Name">
        <input
          className={inputClass}
          value={info.name}
          onChange={(e) => setInfo({ ...info, name: e.target.value })}
        />
      </Field>
      <Field label="Address">
        <input
          className={inputClass}
          value={info.address ?? ""}
          onChange={(e) => setInfo({ ...info, address: e.target.value })}
        />
      </Field>
      <Field label="Owner">
        <input
          className={inputClass}
          value={info.ownerName ?? ""}
          onChange={(e) => setInfo({ ...info, ownerName: e.target.value })}
        />
      </Field>
      <Field label="Owner contact">
        <input
          className={inputClass}
          value={info.ownerContact ?? ""}
          onChange={(e) => setInfo({ ...info, ownerContact: e.target.value })}
        />
      </Field>
      <Field label="Wi-Fi name">
        <input
          className={inputClass}
          value={info.wifiSsid ?? ""}
          onChange={(e) => setInfo({ ...info, wifiSsid: e.target.value })}
        />
      </Field>
      <Field label="Wi-Fi password">
        <input
          className={inputClass}
          value={info.wifiPassword ?? ""}
          onChange={(e) => setInfo({ ...info, wifiPassword: e.target.value })}
        />
      </Field>
      <Field label="Notes">
        <input
          className={inputClass}
          value={info.notes ?? ""}
          onChange={(e) => setInfo({ ...info, notes: e.target.value })}
        />
      </Field>
      <PrimaryButton onClick={save}>{saved || "Save"}</PrimaryButton>
    </div>
  );
}
