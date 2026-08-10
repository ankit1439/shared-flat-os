import { prisma } from "@/lib/db";
import { MEMBER_IDS } from "@/lib/members";

const allowed = new Set<string>(MEMBER_IDS);

export async function notifyMembers(opts: {
  memberIds: string[];
  title: string;
  body?: string;
  kind: string;
  href?: string;
  refId?: string;
}) {
  const unique = [...new Set(opts.memberIds)].filter((id) => allowed.has(id));
  if (unique.length === 0) return;
  await prisma.notification.createMany({
    data: unique.map((memberId) => ({
      memberId,
      title: opts.title,
      body: opts.body ?? null,
      kind: opts.kind,
      href: opts.href ?? null,
      refId: opts.refId ?? null,
    })),
  });
}

export async function notifyEveryoneExcept(
  exceptId: string,
  opts: {
    title: string;
    body?: string;
    kind: string;
    href?: string;
    refId?: string;
  },
) {
  await notifyMembers({
    ...opts,
    memberIds: MEMBER_IDS.filter((id) => id !== exceptId),
  });
}
