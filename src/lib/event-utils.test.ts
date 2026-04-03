import {
  formatEventDate,
  formatEventDateTime,
  formatEventTime,
  getShareInviteText,
} from "./event-utils";

describe("event-utils", () => {
  const isoDateTime = "2026-03-01T02:30:00.000Z";

  it("formatEventDate formats date in Spanish", () => {
    const formatted = formatEventDate(isoDateTime, "America/Mexico_City");
    expect(formatted).toContain("2026");
    expect(formatted.toLowerCase()).toContain("febrero");
  });

  it("formatEventTime formats event time", () => {
    const formatted = formatEventTime(isoDateTime, "America/Mexico_City");
    expect(formatted).toContain("20:30");
  });

  it("formatEventDateTime combines date and time", () => {
    const formatted = formatEventDateTime(isoDateTime, "America/Mexico_City");
    expect(formatted).toContain("·");
    expect(formatted).toContain("20:30");
  });

  it("getShareInviteText includes title, datetime and guest URL", () => {
    const text = getShareInviteText("Cumple de Ana", isoDateTime, "https://nuvo.app/e/abc", "America/Mexico_City");
    expect(text).toContain("Cumple de Ana");
    expect(text).toContain("RSVP aquí: https://nuvo.app/e/abc");
    expect(text).toContain("20:30");
  });

  it("formatters respect timezone", () => {
    const mexico = formatEventTime(isoDateTime, "America/Mexico_City");
    const madrid = formatEventTime(isoDateTime, "Europe/Madrid");

    expect(mexico).not.toBe(madrid);
  });
});
