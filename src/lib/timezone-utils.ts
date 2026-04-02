const FALLBACK_EVENT_TIMEZONE = "America/Mexico_City";

function isValidTimeZone(timeZone?: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveEventTimeZone(timeZone?: string | null): string {
  if (isValidTimeZone(timeZone ?? undefined)) return timeZone as string;
  return FALLBACK_EVENT_TIMEZONE;
}

function getFormatterParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(valueByType.year),
    month: Number(valueByType.month),
    day: Number(valueByType.day),
    hour: Number(valueByType.hour),
    minute: Number(valueByType.minute),
    second: Number(valueByType.second),
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const tzPart = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!tzPart || tzPart === "GMT") return 0;
  const match = tzPart.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || "0");
  return sign * (hours * 60 + minutes);
}

export function eventLocalDateTimeToUtcIso(params: {
  date: string;
  time?: string;
  timeZone?: string | null;
}): string | null {
  const { date, time, timeZone } = params;
  if (!date) return null;

  const tz = resolveEventTimeZone(timeZone);
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time || "12:00").split(":").map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcMs = localAsUtcMs;

  for (let i = 0; i < 4; i++) {
    const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcMs), tz);
    const nextUtcMs = localAsUtcMs - offsetMinutes * 60_000;
    if (nextUtcMs === utcMs) break;
    utcMs = nextUtcMs;
  }

  return new Date(utcMs).toISOString();
}

export function utcIsoToEventLocalParts(isoDateTime: string, timeZone?: string | null) {
  const tz = resolveEventTimeZone(timeZone);
  const date = new Date(isoDateTime);
  const parts = getFormatterParts(date, tz);

  return {
    date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    time: `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
    year: parts.year,
    month: parts.month,
    day: parts.day,
    timeZone: tz,
  };
}

export function getEventLocalDateKey(isoDateTime: string, timeZone?: string | null): string {
  return utcIsoToEventLocalParts(isoDateTime, timeZone).date;
}
