import type { Booking } from "./schema";

// Turning a flat list of bookings into something you can *see* a clash in.
// A list can only ever label a clash; a timeline puts the two bookings
// side by side in the same hour, which is the whole argument of this app.

export type Lane = Booking[];
export type RoomTrack = { room: string; lanes: Lane[] };
export type DaySchedule = { day: string; rooms: RoomTrack[] };

/** The hours the timeline covers. Bookings outside it would render off the
 *  grid, so the form offers exactly this range. */
export const FIRST_HOUR = 8;
export const LAST_HOUR = 21;
export const HOUR_SLOTS = LAST_HOUR - FIRST_HOUR;

/**
 * Calendar lane packing. A booking goes in the first lane whose previous
 * booking has already finished; anything that overlaps therefore cannot
 * share a lane and is pushed onto a new row directly beneath its clash.
 *
 * That's the point: the stacking IS the clash indicator. A room with one
 * lane has no conflicts, and the number of lanes is how bad the pile-up is.
 */
export function lanesFor(list: Booking[]): Lane[] {
  const sorted = [...list].sort((a, b) => a.startHour - b.startHour || a.id - b.id);
  const lanes: Lane[] = [];
  for (const booking of sorted) {
    // `endHour <= startHour` and not `<` — end is exclusive, so a 10:00
    // finish and a 10:00 start share a lane rather than reading as a clash.
    const lane = lanes.find((l) => l[l.length - 1].endHour <= booking.startHour);
    if (lane) lane.push(booking);
    else lanes.push([booking]);
  }
  return lanes;
}

/** Group bookings into days, then rooms within a day, then lanes within a
 *  room — the shape the page renders directly. */
export function schedule(bookings: Booking[]): DaySchedule[] {
  const days = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const list = days.get(booking.day);
    if (list) list.push(booking);
    else days.set(booking.day, [booking]);
  }

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, inDay]) => {
      const rooms = new Map<string, Booking[]>();
      for (const booking of inDay) {
        const list = rooms.get(booking.room);
        if (list) list.push(booking);
        else rooms.set(booking.room, [booking]);
      }
      return {
        day,
        rooms: [...rooms.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([room, list]) => ({ room, lanes: lanesFor(list) })),
      };
    });
}

/** Where a booking sits on the grid: CSS column lines, 1-based. */
export function span(booking: Booking): { start: number; end: number } {
  return {
    start: booking.startHour - FIRST_HOUR + 1,
    end: booking.endHour - FIRST_HOUR + 1,
  };
}

/** A 24h hour as `09:00`. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
