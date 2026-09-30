import { describe, expect, it } from "vitest";
import type { Booking } from "../src/lib/schema";
import { FIRST_HOUR, lanesFor, schedule, span } from "../src/lib/schedule";

// The lane packing is the one piece of this app that can be wrong without
// anything going red: the page still renders, the bookings are all there, and
// a clash quietly sits in the same row as the thing it clashes with. So it
// gets asserted directly rather than through the page.

let next = 0;
const at = (startHour: number, endHour: number, room = "Marie Reay 4.03"): Booking => ({
  id: ++next,
  room,
  bookedBy: `Person ${next}`,
  day: "2026-10-07",
  startHour,
  endHour,
  purpose: null,
  createdAt: "2026-10-07 00:00:00",
});

const shape = (lanes: Booking[][]) => lanes.map((lane) => lane.map((b) => [b.startHour, b.endHour]));

describe("lane packing", () => {
  it("keeps a room with no overlaps on one lane", () => {
    expect(shape(lanesFor([at(9, 10), at(11, 12), at(14, 16)]))).toEqual([
      [
        [9, 10],
        [11, 12],
        [14, 16],
      ],
    ]);
  });

  it("treats the end hour as exclusive, so back-to-back bookings share a lane", () => {
    // The off-by-one that would make this feature useless: if 09:00–10:00 and
    // 10:00–11:00 stacked, every consecutive pair of classes would read as a
    // clash and the stacking would stop meaning anything.
    expect(lanesFor([at(9, 10), at(10, 11)])).toHaveLength(1);
  });

  it("pushes an overlap onto its own lane", () => {
    expect(shape(lanesFor([at(9, 11), at(10, 12)]))).toEqual([[[9, 11]], [[10, 12]]]);
  });

  it("stacks as deep as the pile-up goes", () => {
    expect(lanesFor([at(9, 10), at(9, 10), at(9, 10)])).toHaveLength(3);
  });

  it("reuses a lane once its last booking has finished", () => {
    // Two clashing bookings in the morning, one free-standing booking in the
    // afternoon. The afternoon one must fall back to lane 1 — otherwise the
    // track grows a row for every booking and depth stops meaning anything.
    const lanes = lanesFor([at(9, 11), at(10, 12), at(15, 16)]);
    expect(shape(lanes)).toEqual([
      [
        [9, 11],
        [15, 16],
      ],
      [[10, 12]],
    ]);
  });

  it("does not depend on the order it is handed the bookings", () => {
    // listBookings() orders by day and start hour, but the packer must not
    // rely on that — an ordering change in db.ts would otherwise silently
    // scramble the rows rather than fail a test.
    const bookings = [at(9, 11), at(10, 12), at(13, 14)];
    expect(shape(lanesFor([...bookings].reverse()))).toEqual(shape(lanesFor(bookings)));
  });
});

describe("grouping", () => {
  it("separates rooms, so two rooms at the same hour never stack", () => {
    const days = schedule([at(9, 10, "Marie Reay 4.03"), at(9, 10, "Hanna Neumann 1.21")]);
    expect(days).toHaveLength(1);
    expect(days[0].rooms).toHaveLength(2);
    expect(days[0].rooms.every((room) => room.lanes.length === 1)).toBe(true);
  });

  it("orders days oldest first", () => {
    const days = schedule([
      { ...at(9, 10), day: "2026-10-09" },
      { ...at(9, 10), day: "2026-10-07" },
    ]);
    expect(days.map((d) => d.day)).toEqual(["2026-10-07", "2026-10-09"]);
  });
});

describe("grid placement", () => {
  it("puts the first hour of the day on the first column line", () => {
    expect(span(at(FIRST_HOUR, FIRST_HOUR + 1))).toEqual({ start: 1, end: 2 });
  });

  it("spans as many columns as the booking has hours", () => {
    const { start, end } = span(at(9, 12));
    expect(end - start).toBe(3);
  });
});
