import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PIN_RE = /^\d{4}$/;

export function isValidPin(pin: string) {
  return PIN_RE.test(pin);
}

/** Store as salt:hash (hex). */
export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(pin, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}
