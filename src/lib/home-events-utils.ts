import { getEventLocalDateKey } from "@/lib/timezone-utils";

export interface SavedEvent {
  eventKey: string;
  title: string;
  hostUrl?: string;
  startAt?: string;
  timezone?: string;
  coverImageUrl?: string | null;
  status?: string;
  role: "host" | "guest";
}

interface BackendEventShape {
  event_key: string;
  title: string;
  start_at?: string | null;
  timezone?: string | null;
  status?: string | null;
  cover_image_url?: string | null;
}

export function mapHostedEvents(events: BackendEventShape[] = []): SavedEvent[] {
  return events.map((event) => ({
    eventKey: event.event_key,
    title: event.title,
    hostUrl: `/h/${event.event_key}`,
    startAt: event.start_at || undefined,
    timezone: event.timezone || undefined,
    status: event.status || undefined,
    coverImageUrl: event.cover_image_url || null,
    role: "host" as const,
  }));
}

export function mapGuestEvents(events: BackendEventShape[] = []): SavedEvent[] {
  return events.map((event) => ({
    eventKey: event.event_key,
    title: event.title,
    startAt: event.start_at || undefined,
    timezone: event.timezone || undefined,
    status: event.status || undefined,
    coverImageUrl: event.cover_image_url || null,
    role: "guest" as const,
  }));
}

export function mergeGuestEvents(backendEvents: SavedEvent[], legacyEvents: SavedEvent[]): SavedEvent[] {
  const byEventKey = new Map<string, SavedEvent>();
  backendEvents.forEach((event) => byEventKey.set(event.eventKey, event));
  legacyEvents.forEach((event) => {
    if (!byEventKey.has(event.eventKey)) {
      byEventKey.set(event.eventKey, event);
    }
  });
  return Array.from(byEventKey.values());
}

export function getEventDaysForMonth(events: SavedEvent[], year: number, monthIndex: number): Set<number> {
  const eventDays = new Set<number>();

  events.forEach((ev) => {
    if (!ev.startAt) return;

    const [eventYear, eventMonth, eventDay] = getEventLocalDateKey(ev.startAt, ev.timezone).split("-").map(Number);
    if (eventYear === year && eventMonth === monthIndex + 1) {
      eventDays.add(eventDay);
    }
  });

  return eventDays;
}

function sortByStartAsc(a: SavedEvent, b: SavedEvent): number {
  return new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime();
}

function sortByStartDesc(a: SavedEvent, b: SavedEvent): number {
  return new Date(b.startAt!).getTime() - new Date(a.startAt!).getTime();
}

export function getSelectedDayEvents(events: SavedEvent[], year: number, monthIndex: number, day: number | null): SavedEvent[] {
  if (!day) return [];

  return events
    .filter((ev) => {
      if (!ev.startAt) return false;
      const [eventYear, eventMonth, eventDay] = getEventLocalDateKey(ev.startAt, ev.timezone).split("-").map(Number);
      return eventYear === year && eventMonth === monthIndex + 1 && eventDay === day;
    })
    .sort(sortByStartAsc);
}

export function getUpcomingEvents(events: SavedEvent[], nowIso: string, limit = 5): SavedEvent[] {
  return events
    .filter((ev) => {
      if (!ev.startAt) return false;
      const eventDateKey = getEventLocalDateKey(ev.startAt, ev.timezone);
      const todayInEventTz = getEventLocalDateKey(nowIso, ev.timezone);
      return eventDateKey >= todayInEventTz;
    })
    .sort(sortByStartAsc)
    .slice(0, limit);
}

export function getPastEvents(events: SavedEvent[], nowIso: string, limit = 3): SavedEvent[] {
  return events
    .filter((ev) => {
      if (!ev.startAt) return true;
      const eventDateKey = getEventLocalDateKey(ev.startAt, ev.timezone);
      const todayInEventTz = getEventLocalDateKey(nowIso, ev.timezone);
      return eventDateKey < todayInEventTz;
    })
    .sort(sortByStartDesc)
    .slice(0, limit);
}
