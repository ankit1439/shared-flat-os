import { cookies } from "next/headers";
import { memberById, type MemberId } from "./members";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };

export async function getCurrentMember() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const member = memberById(id);
  if (!member) return null;
  return member as { id: MemberId; name: string; short: string };
}

export async function requireMember() {
  const member = await getCurrentMember();
  if (!member) return null;
  return member;
}
