export const MEMBERS = [
  { id: "ankit", name: "Ankit Joshi", short: "Ankit" },
  { id: "jayash", name: "Jayash Ghelot", short: "Jayash" },
  { id: "rahul", name: "Rahul Verma", short: "Rahul" },
  { id: "lakshit", name: "Lakshit Pareek", short: "Lakshit" },
] as const;

export type MemberId = (typeof MEMBERS)[number]["id"];

export const MEMBER_IDS = MEMBERS.map((m) => m.id);

export function memberById(id: string) {
  return MEMBERS.find((m) => m.id === id) ?? null;
}

export function shortName(id: string) {
  return memberById(id)?.short ?? id;
}
