/** Preserve the existing KST-wall-clock-as-Z convention; reject calendar rollover. */
export function normDate(input) {
  let value = String(input ?? "").trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) value += "T09:00";
  value = value.replace(/(?:[zZ]|[+-]\d{2}:?\d{2})$/, "");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) value += ":00";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) return "Invalid Date";
  const normalized = `${value}Z`;
  const parsed = new Date(normalized);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().replace(".000Z", "Z") === normalized
    ? normalized : "Invalid Date";
}
