import webpush from "web-push";
import { prisma } from "@/lib/db";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:flat-os@local";

let configured = false;

function ensureWebPush() {
  if (configured) return publicKey && privateKey;
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return true;
  }
  return false;
}

export function getVapidPublicKey() {
  return publicKey;
}

export async function sendPushToMembers(
  memberIds: string[],
  payload: { title: string; body?: string; href?: string; kind?: string },
) {
  if (!ensureWebPush() || memberIds.length === 0) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { memberId: { in: memberIds } },
  });

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    href: payload.href ?? "/home",
    kind: payload.kind ?? "general",
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
        }
      }
    }),
  );
}
