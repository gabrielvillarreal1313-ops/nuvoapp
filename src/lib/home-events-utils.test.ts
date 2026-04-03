import {
  getEventDaysForMonth,
  getPastEvents,
  getSelectedDayEvents,
  getUpcomingEvents,
  mapGuestEvents,
  mapHostedEvents,
  mergeGuestEvents,
  type SavedEvent,
} from "./home-events-utils";

describe("home-events-utils", () => {
  const nowIso = "2026-03-01T12:00:00.000Z";

  const events: SavedEvent[] = [
    {
      eventKey: "host-upcoming",
      title: "Host future",
      startAt: "2026-03-10T17:00:00.000Z",
      timezone: "America/Mexico_City",
      role: "host",
    },
    {
      eventKey: "guest-today",
      title: "Guest today",
      startAt: "2026-03-01T18:00:00.000Z",
      timezone: "America/Mexico_City",
      role: "guest",
    },
    {
      eventKey: "past",
      title: "Past",
      startAt: "2026-02-20T18:00:00.000Z",
      timezone: "America/Mexico_City",
      role: "guest",
    },
    {
      eventKey: "missing-start",
      title: "No start",
      role: "guest",
    },
  ];

  it("classifies upcoming and past events using event timezone", () => {
    const upcoming = getUpcomingEvents(events, nowIso, 5);
    const past = getPastEvents(events, nowIso, 5);

    expect(upcoming.map((e) => e.eventKey)).toEqual(["guest-today", "host-upcoming"]);
    expect(past.map((e) => e.eventKey)).toEqual(["missing-start", "past"]);
  });

  it("returns days in month with events and selected day events sorted", () => {
    const days = getEventDaysForMonth(events, 2026, 2);
    expect(Array.from(days).sort((a, b) => a - b)).toEqual([1, 10]);

    const selected = getSelectedDayEvents(events, 2026, 2, 1);
    expect(selected.map((e) => e.eventKey)).toEqual(["guest-today"]);
  });

  it("merges guest events with backend as source of truth by eventKey", () => {
    const backend: SavedEvent[] = [
      { eventKey: "abc", title: "Backend title", startAt: "2026-03-10T00:00:00.000Z", timezone: "America/Mexico_City", role: "guest" },
    ];
    const legacy: SavedEvent[] = [
      { eventKey: "abc", title: "Legacy title", startAt: "2026-03-11T00:00:00.000Z", timezone: "Europe/Madrid", role: "guest" },
      { eventKey: "legacy-only", title: "Legacy only", role: "guest" },
    ];

    const merged = mergeGuestEvents(backend, legacy);

    expect(merged.find((e) => e.eventKey === "abc")?.title).toBe("Backend title");
    expect(merged.map((e) => e.eventKey)).toContain("legacy-only");
  });

  it("maps backend hosted/guest events preserving critical fields", () => {
    const backendEvent = {
      event_key: "key-123",
      title: "Evento",
      start_at: "2026-03-01T16:30:00.000Z",
      timezone: "America/Mexico_City",
      status: "published",
      cover_image_url: "https://img.test/cover.png",
    };

    const hosted = mapHostedEvents([backendEvent])[0];
    const guest = mapGuestEvents([backendEvent])[0];

    expect(hosted).toMatchObject({
      eventKey: "key-123",
      startAt: "2026-03-01T16:30:00.000Z",
      timezone: "America/Mexico_City",
      role: "host",
      hostUrl: "/h/key-123",
    });

    expect(guest).toMatchObject({
      eventKey: "key-123",
      startAt: "2026-03-01T16:30:00.000Z",
      timezone: "America/Mexico_City",
      role: "guest",
    });
  });
});
