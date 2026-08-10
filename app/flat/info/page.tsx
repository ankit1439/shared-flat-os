import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SiteChrome } from "@/components/SiteChrome";
import { InfoClient } from "./ui";

export default async function InfoPage() {
  const who = await getCurrentMember();
  if (!who) redirect("/who");
  return (
    <SiteChrome who={who.short}>
      <InfoClient />
    </SiteChrome>
  );
}
