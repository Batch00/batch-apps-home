// Small value checks shared by the payload allowlists (ytd-payload.js, wrap-private-payload.js).
// Each returns the value when it has the expected type and range, else null, so a payload is
// rebuilt from known keys only and nothing unexpected passes through.

const CODE_PATTERN = /^[A-Z]{2}$/;

export function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function int(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

export function text(value, maxLength) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

export function code(value) {
  return typeof value === "string" && CODE_PATTERN.test(value) ? value : null;
}

export function list(value) {
  return Array.isArray(value) ? value : [];
}

export function obj(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function pick(source, keys) {
  const out = {};
  for (const key of keys) out[key] = num(source[key]);
  return out;
}

// Keeps the items whose required field passed; mapper returns null to drop an item.
export function mapList(value, mapper) {
  return list(value)
    .map((item) => mapper(obj(item)))
    .filter(Boolean);
}
