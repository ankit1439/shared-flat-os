import { formatINR } from "@/lib/money";

export function Rupee({
  paise,
  signed = false,
  className = "",
}: {
  paise: number;
  signed?: boolean;
  className?: string;
}) {
  const tone =
    signed && paise > 0
      ? "text-get"
      : signed && paise < 0
        ? "text-owe"
        : "";
  return <span className={`tabular-nums ${tone} ${className}`}>{formatINR(paise, signed)}</span>;
}
