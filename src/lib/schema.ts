import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

// A room booking request. Deliberately NOT unique on (room, day, hours):
// the whole point of this app is that the existing system hides clashes
// until someone turns up to a booked room, so a clash has to be storable
// in order to be shown. Validity is a question the page answers, not a
// constraint the database enforces.
export const bookings = sqliteTable("bookings", {
  id: int().primaryKey({ autoIncrement: true }),
  room: text().notNull(),
  bookedBy: text("booked_by").notNull(),
  /** ISO date, YYYY-MM-DD. */
  day: text().notNull(),
  /** Whole hours on a 24h clock; end is exclusive, so 9–10 is one hour. */
  startHour: int("start_hour").notNull(),
  endHour: int("end_hour").notNull(),
  purpose: text(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Booking = typeof bookings.$inferSelect;
