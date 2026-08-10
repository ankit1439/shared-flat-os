import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SiteChrome } from "@/components/SiteChrome";
import { MoneyClient } from "./ui";

export default async function MoneyPage() {
  const who = await getCurrentMember();
  if (!who) redirect("/who");
  return (
    <SiteChrome who={who.short}>
      <MoneyClient meId={who.id} />
    </SiteChrome>
  );
}
