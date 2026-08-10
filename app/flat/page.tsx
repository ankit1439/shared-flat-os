import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SiteChrome } from "@/components/SiteChrome";
import { Card } from "@/components/ui";

const LINKS = [
  { href: "/flat/reminders", title: "Reminders", desc: "Tell someone something — with notifications" },
  { href: "/flat/shopping", title: "Shopping", desc: "What we need to buy" },
  { href: "/flat/inventory", title: "Inventory", desc: "What we currently have" },
  { href: "/money/add?type=milk", title: "Milk", desc: "Log today’s milk" },
  { href: "/money/add?type=vegetables", title: "Vegetables", desc: "Log sabzi purchase" },
  { href: "/flat/keys", title: "Keys", desc: "Who has which key" },
  { href: "/flat/chores", title: "Chores", desc: "This week’s rotation" },
  { href: "/flat/issues", title: "Issues", desc: "Leaks, repairs, broken things" },
  { href: "/flat/info", title: "Flat info", desc: "Address, rent, Wi-Fi, owner" },
];

export default async function FlatPage() {
  const who = await getCurrentMember();
  if (!who) redirect("/who");
  return (
    <SiteChrome who={who.short}>
      <h1 className="mb-4 text-xl font-semibold">Flat</h1>
      <div className="grid gap-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card>
              <p className="font-semibold">{l.title}</p>
              <p className="text-sm text-mute">{l.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </SiteChrome>
  );
}
