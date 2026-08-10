import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";

export default async function RootPage() {
  const who = await getCurrentMember();
  redirect(who ? "/home" : "/who");
}
