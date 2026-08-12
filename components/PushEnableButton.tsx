"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushEnableButton() {
  const [status, setStatus] = useState<"idle" | "on" | "off" | "unsupported" | "busy">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "granted") setStatus("on");
    else setStatus("off");
  }, []);

  async function enable() {
    setBusy();
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("off");
        setMsg("Permission denied");
        return;
      }

      const cfg = await fetch("/api/push", { cache: "no-store" }).then((r) => r.json());
      if (!cfg.enabled || !cfg.publicKey) {
        setStatus("off");
        setMsg("Push not configured on server");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
        });
      }

      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      setStatus("on");
      setMsg("Phone alerts on");
      if (Notification.permission === "granted") {
        new Notification("Shared Flat OS", {
          body: "You’ll get alerts for reminders, money & who’s home.",
          icon: "/icon.svg",
        });
      }
    } catch (e) {
      setStatus("off");
      setMsg(e instanceof Error ? e.message : "Could not enable");
    }
  }

  function setBusy() {
    setStatus("busy");
  }

  if (status === "unsupported") {
    return <p className="text-[11px] text-mute">This browser can’t do push alerts.</p>;
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        disabled={status === "busy" || status === "on"}
        onClick={enable}
        className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60"
      >
        {status === "on" ? "Alerts on" : status === "busy" ? "…" : "Enable alerts"}
      </button>
      {msg ? <span className="text-[10px] text-mute">{msg}</span> : null}
    </div>
  );
}
