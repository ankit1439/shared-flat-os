"use client";

import { useEffect, useRef } from "react";

const STORAGE_KEY = "flat_os_last_gps_check";
const MIN_INTERVAL_MS = 15 * 60 * 1000; // don't spam more than once per 15 min

/**
 * When the app opens (or returns to foreground), quietly check GPS
 * against the saved flat pin and update presence.
 */
export function AutoPresenceCheck() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    function shouldRun() {
      try {
        const last = Number(sessionStorage.getItem(STORAGE_KEY) || "0");
        return Date.now() - last > MIN_INTERVAL_MS;
      } catch {
        return true;
      }
    }

    function markRan() {
      try {
        sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }

    async function check() {
      if (!shouldRun()) return;
      if (!("geolocation" in navigator)) return;

      // Only auto-check if permission was already granted (don't pop a surprise prompt every open)
      let permission: PermissionState | "unknown" = "unknown";
      try {
        if (navigator.permissions?.query) {
          const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          permission = status.state;
        }
      } catch {
        permission = "unknown";
      }
      if (permission === "denied") return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          markRan();
          await fetch("/api/presence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              source: "gps_auto",
            }),
          }).catch(() => null);
        },
        () => {
          // Permission denied or timeout — stay quiet
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
      );
    }

    check();

    function onVisible() {
      if (document.visibilityState === "visible") check();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
