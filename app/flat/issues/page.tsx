import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SiteChrome } from "@/components/SiteChrome";
import { IssuesClient } from "./ui";

export default async function IssuesPage() {
  const who = await getCurrentMember();
  if (!who) redirect("/who");
  return (
    <SiteChrome who={who.short}>
      <IssuesClient />
    </SiteChrome>
  );
}
