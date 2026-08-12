"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Wallet, Building2, Users, Bell } from "lucide-react";
import { ClientOnly } from "@/components/ClientOnly";
import { PushEnableButton } from "@/components/PushEnableButton";
import { AutoPresenceCheck } from "@/components/AutoPresenceCheck";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/flat", label: "Flat", icon: Building2 },
  { href: "/people", label: "People", icon: Users },
];

type Notif = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
  kind: string;
};

function HeaderActions() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);

  async function loadNotifs() {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setUnread(json.unreadCount ?? 0);
    setItems(json.notifications ?? []);
  }

  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 10000);
    return () => clearInterval(t);
  }, [path]);

  async function markRead(id: string, href?: string | null) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", id }),
    });
    await loadNotifs();
    setOpen(false);
    if (href) window.location.href = href;
  }

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    });
    await loadNotifs();
  }

  async function switchUser() {
    await fetch("/api/session", { method: "DELETE" });
    window.location.href = "/who";
  }

  return (
    <div className="relative flex items-center gap-2">
      <PushEnableButton />
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          loadNotifs();
        }}
        className="relative rounded-full border border-line bg-card p-2"
        aria-label="Notifications"
        suppressHydrationWarning
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-owe px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={switchUser}
        className="text-xs text-mute underline-offset-2 hover:underline"
      >
        Switch
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-30 w-[min(100vw-2rem,20rem)] max-h-72 overflow-y-auto rounded-2xl border border-line bg-card p-2 shadow-card">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
              Notifications
            </p>
            {unread > 0 ? (
              <button type="button" onClick={markAll} className="text-[11px] text-mute underline">
                Mark all read
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="px-2 py-4 text-sm text-mute">No notifications yet.</p>
          ) : (
            <div className="space-y-1">
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id, n.href)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left ${
                    n.read ? "bg-transparent" : "bg-paper"
                  }`}
                >
                  <p className={`text-sm ${n.read ? "font-medium" : "font-semibold"}`}>{n.title}</p>
                  {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-mute">{n.body}</p> : null}
                  <p className="mt-1 text-[10px] text-mute">
                    {new Date(n.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {!n.read ? " · New" : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SiteChrome({
  who,
  children,
}: {
  who: string;
  children: ReactNode;
}) {
  const path = usePathname();

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg">
      <ClientOnly>
        <AutoPresenceCheck />
      </ClientOnly>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">
              Shared Flat OS
            </p>
            <p className="text-sm font-medium">Hi, {who}</p>
          </div>
          <ClientOnly
            fallback={
              <Link href="/who" className="text-xs text-mute underline-offset-2 hover:underline">
                Switch
              </Link>
            }
          >
            <HeaderActions />
          </ClientOnly>
        </div>
      </header>
      <main className="safe-bottom px-4 pt-4">
        <ClientOnly fallback={<p className="text-sm text-mute">Loading…</p>}>
          {children}
        </ClientOnly>
      </main>
      <ClientOnly
        fallback={
          <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            <div className="mx-auto grid max-w-lg grid-cols-4 py-5" />
          </nav>
        }
      >
        <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto grid max-w-lg grid-cols-4">
            {NAV.map((item) => {
              const active = path === item.href || path.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                    active ? "font-semibold text-ink" : "text-mute"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </ClientOnly>
    </div>
  );
}
