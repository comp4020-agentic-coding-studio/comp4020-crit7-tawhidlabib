import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Booking, bookings } from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { Booking };

/** The rooms this prototype knows about. A real version would read these
 *  from the room database; naming four real MRB rooms is enough to show the
 *  shape without inventing a building's worth of plausible-looking ones. */
export const ROOMS = [
  "Marie Reay 4.03",
  "Marie Reay 5.02",
  "Marie Reay 6.05",
  "Hanna Neumann 1.21",
] as const;

export function listBookings(): Booking[] {
  return db
    .select()
    .from(bookings)
    .orderBy(asc(bookings.day), asc(bookings.startHour), asc(bookings.id))
    .limit(200)
    .all();
}

export function addBooking(input: {
  room: string;
  bookedBy: string;
  day: string;
  startHour: number;
  endHour: number;
  purpose?: string | null;
}): Booking {
  return db.insert(bookings).values(input).returning().get();
}

/** Two bookings collide when they want the same room on the same day and
 *  their hour ranges overlap. End is exclusive, so 9–10 and 10–11 are fine
 *  — the off-by-one that would make every back-to-back booking look like a
 *  clash. */
export function clashes(a: Booking, b: Booking): boolean {
  if (a.id === b.id) return false;
  if (a.room !== b.room || a.day !== b.day) return false;
  return a.startHour < b.endHour && b.startHour < a.endHour;
}

/** The ids of every booking that collides with at least one other. */
export function clashingIds(all: Booking[]): Set<number> {
  const hit = new Set<number>();
  for (const a of all) {
    for (const b of all) {
      if (clashes(a, b)) {
        hit.add(a.id);
        hit.add(b.id);
      }
    }
  }
  return hit;
}
