/** Flat is in India — always show times in IST. */
export const FLAT_TIMEZONE = "Asia/Kolkata";

export function formatFlatDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", { timeZone: FLAT_TIMEZONE, ...options });
}

export function formatFlatTime(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  },
): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-IN", { timeZone: FLAT_TIMEZONE, ...options });
}

export function formatFlatDateTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-IN", {
    timeZone: FLAT_TIMEZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** YYYY-MM-DD in Asia/Kolkata for grouping ledger days. */
export function flatDayKey(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  // en-CA gives ISO-like YYYY-MM-DD
  return d.toLocaleDateString("en-CA", { timeZone: FLAT_TIMEZONE });
}

/** YYYY-MM in Asia/Kolkata */
export function flatMonthKey(value: Date | string = new Date()): string {
  return flatDayKey(value).slice(0, 7);
}
