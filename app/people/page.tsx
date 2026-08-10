import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SiteChrome } from "@/components/SiteChrome";
import { PeopleClient } from "./ui";

export default async function PeoplePage() {
  const who = await getCurrentMember();
  if (!who) redirect("/who");
  return (
    <SiteChrome who={who.short}>
      <PeopleClient meId={who.id} />
    </SiteChrome>
  );
}
