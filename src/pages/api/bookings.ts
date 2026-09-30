import type { APIRoute } from "astro";
import { ROOMS, addBooking } from "../../lib/db";
import { bus } from "../../lib/events";

// A plain HTML form POSTs here, the booking goes into SQLite, and the new
// row is broadcast to every open SSE connection. The 303 redirect makes the
// form work with no client-side JavaScript at all — the submitting tab
// re-renders from the database; every *other* tab hears about it over the
// stream.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();

  const room = String(form.get("room") ?? "").trim();
  const bookedBy = String(form.get("bookedBy") ?? "").trim();
  const day = String(form.get("day") ?? "").trim();
  const startHour = Number(form.get("startHour"));
  const endHour = Number(form.get("endHour"));
  const purpose = String(form.get("purpose") ?? "").trim();

  // Reject what can't be stored sensibly; a clash is NOT in that category —
  // it's stored and shown, because hiding it is the thing this app exists to
  // fix.
  const valid =
    ROOMS.includes(room as (typeof ROOMS)[number]) &&
    bookedBy.length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isInteger(startHour) &&
    Number.isInteger(endHour) &&
    startHour >= 0 &&
    endHour <= 24 &&
    startHour < endHour;

  if (!valid) return redirect("/?error=1", 303);

  const booking = addBooking({
    room,
    bookedBy: bookedBy.slice(0, 120),
    day,
    startHour,
    endHour,
    purpose: purpose ? purpose.slice(0, 200) : null,
  });

  bus.emit("booking", booking);
  return redirect("/", 303);
};
