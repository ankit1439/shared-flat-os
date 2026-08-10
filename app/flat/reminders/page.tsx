import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SiteChrome } from "@/components/SiteChrome";
import { RemindersClient } from "./ui";

export default async function RemindersPage() {
  const who = await getCurrentMember();
  if (!who) redirect("/who");
  return (
    <SiteChrome who={who.short}>
      <RemindersClient meId={who.id} />
    </SiteChrome>
  );
}
