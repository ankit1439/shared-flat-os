import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SiteChrome } from "@/components/SiteChrome";
import { AddExpenseForm } from "./ui";

export default async function AddExpensePage() {
  const who = await getCurrentMember();
  if (!who) redirect("/who");
  return (
    <SiteChrome who={who.short}>
      <AddExpenseForm meId={who.id} />
    </SiteChrome>
  );
}
