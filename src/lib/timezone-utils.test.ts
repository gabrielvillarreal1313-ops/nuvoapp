import {
  eventLocalDateTimeToUtcIso,
  getEventLocalDateKey,
  resolveEventTimeZone,
  utcIsoToEventLocalParts,
} from "./timezone-utils";

describe("timezone-utils", () => {
  it("resolveEventTimeZone returns valid timezone", () => {
    expect(resolveEventTimeZone("America/Bogota")).toBe("America/Bogota");
  });

  it("resolveEventTimeZone falls back when timezone is invalid or missing", () => {
    expect(resolveEventTimeZone("Mars/Olympus")).toBe("America/Mexico_City");
    expect(resolveEventTimeZone(undefined)).toBe("America/Mexico_City");
    expect(resolveEventTimeZone(null)).toBe("America/Mexico_City");
  });

  it("eventLocalDateTimeToUtcIso converts local event datetime to UTC ISO", () => {
    const iso = eventLocalDateTimeToUtcIso({
      date: "2026-03-01",
      time: "10:30",
      timeZone: "America/Mexico_City",
    });

    expect(iso).toBe("2026-03-01T16:30:00.000Z");
  });

  it("utcIsoToEventLocalParts produces a reasonable roundtrip", () => {
    const originalDate = "2026-03-01";
    const originalTime = "10:30";
    const iso = eventLocalDateTimeToUtcIso({
      date: originalDate,
      time: originalTime,
      timeZone: "America/Mexico_City",
    });

    expect(iso).toBeTruthy();
    const roundtrip = utcIsoToEventLocalParts(iso!, "America/Mexico_City");

    expect(roundtrip.date).toBe(originalDate);
    expect(roundtrip.time).toBe(originalTime);
    expect(roundtrip.timeZone).toBe("America/Mexico_City");
  });

  it("getEventLocalDateKey returns local date key", () => {
    const dateKey = getEventLocalDateKey("2026-03-01T16:30:00.000Z", "America/Mexico_City");
    expect(dateKey).toBe("2026-03-01");
  });
});
