// Formatting and year-state helpers shared by the wrap chapters.

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthName(month) {
  return MONTHS[month - 1] ?? "";
}

export function monthInitial(month) {
  return monthName(month).charAt(0);
}

// fixed = true keeps the decimal places while a number counts up, so its width stays steady.
export function formatNumber(value, decimals = 0, fixed = false) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: fixed ? decimals : 0,
    maximumFractionDigits: decimals,
  });
}

// Private view only: whole dollars, "-$1,234" below zero.
export function formatMoney(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const rounded = Math.round(Math.abs(value));
  return `${value < 0 && rounded > 0 ? "-" : ""}$${rounded.toLocaleString("en-US")}`;
}

export function formatPercent(value, decimals = 0) {
  const text = formatNumber(value, decimals);
  return text ? `${text}%` : "";
}

// Private view only: "Sep 3" from YYYY-MM-DD, without a time zone shift.
export function formatDay(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return "";
  return `${monthName(Number(match[2])).slice(0, 3)} ${Number(match[3])}`;
}

// "Sep 3 to 14", "Sep 28 to Oct 4", or just "Sep 3".
export function formatDayRange(start, end) {
  const from = formatDay(start);
  const to = formatDay(end);
  if (!from) return "";
  if (!to || to === from) return from;
  return start.slice(0, 7) === end.slice(0, 7) ? `${from} to ${to.split(" ")[1]}` : `${from} to ${to}`;
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function plural(count, one, many = `${one}s`) {
  return count === 1 ? one : many;
}

// "So far" while the year is open, "final" once the payload is frozen (is_partial false).
export function yearState(data) {
  const isFinal = data.is_partial === false;
  const asOfMonth = Number(/^\d{4}-(\d{2})/.exec(data.as_of ?? "")?.[1]) || 12;
  return {
    isFinal,
    label: isFinal ? `${data.year} in review` : `${data.year} so far`,
    // Last month with data: December once final, else the month of the refresh.
    lastMonth: isFinal ? 12 : asOfMonth,
  };
}
