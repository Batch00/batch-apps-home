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
