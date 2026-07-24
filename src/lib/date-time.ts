export const LIMA_TIME_ZONE = "America/Lima";

function dateParts(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIMA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function formatDateLima(value: Date | string) {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatTimeLima(value: Date | string) {
  const parts = dateParts(value);
  return `${parts.hour}:${parts.minute}:${parts.second}`;
}

export function formatDateTimeLima(value: Date | string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateOnlyLima(value: Date | string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TIME_ZONE,
    dateStyle: "short",
  }).format(new Date(value));
}
