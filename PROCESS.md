# Process overview

## What I built

A room-booking prototype that stores double bookings instead of rejecting them,
and marks both sides of every clash. `README.md` argues why that is the right
call; this file is how the repo got here.

## How I got here

The honest version: the setup was done a week early and the app was built in
forty-five minutes on the morning of the cutoff. The commit timestamps say so,
and the shape of this repo is a direct result.

Setup came first, deliberately in two commits before any prototype code. The
harness came forward from Assignment 2 as its own commit,
[`fb9ee17`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tawhidlabib/commit/fb9ee17),
so that the first thing in this repo's history answers "where did this
`CLAUDE.md` come from". That merge was a sort, not a copy: the working rules and
the lockfile rule survived; everything true only of a static site under a
GitHub Pages base path was dropped, because this repo is `output: "server"` on
Fly and has no base path at all. Two rules were generalised rather than
discarded — the Assignment 2 lesson about fabricated DOIs became a rule about
invented **room numbers and course codes**, which turned out to matter (see
below), and a lesson about judging rendered artwork became a rule about driving
running state rather than reading handlers.

Then the spec tests, before the app existed, in
[`ada606f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tawhidlabib/commit/ada606f).
They started red on purpose and stayed red for a week. The one worth pointing at
asserts persistence by booting a server, writing, killing it, and booting a cold
one on the same SQLite file:

> a plain second GET would pass against an in-memory array, which is the
> failure this spec line exists to catch

That test is the reason I trust the deployed app survives a Fly machine restart,
which is not something the guestbook's own test ever checked.

The build itself,
[`f53978b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tawhidlabib/commit/f53978b),
reshaped the starter's plumbing rather than replacing it — the decision the time
made for me, and the one I would defend anyway. The single real design choice
was refusing the obvious one: not rejecting a clash on submit. Rejecting tells
the second person "no" and the first person nothing. The schema carries that
decision as the *absence* of a unique constraint on `(room, day, hours)`, with a
comment saying why, so the next person to read it doesn't 'fix' it.

The last commit before the cutoff,
[`aeeee38`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tawhidlabib/commit/aeeee38),
is the one I'd point at in the crit, because it is where I stopped believing my
own README. The page up to then was a list with a warning badge on each
colliding row — it *said* two bookings collide and showed nothing, which is the
same failure I'd written three paragraphs accusing the real system of. Replacing
it with a timetable made the argument structural: a booking that overlaps
another cannot share a row with it, so it lands on a lane beneath it, and the
depth of the stack is the severity. The lane packer went into its own module
precisely because it is the kind of code that fails silently — the page renders,
every booking is present, and a clash is merely in the wrong row — so
`spec/schedule.test.ts` asserts it directly rather than through the page,
including the same end-exclusive boundary the API test pins.

Two corrections came from checks rather than from me. `pnpm db:generate` stalled
on an interactive prompt asking whether `bookings` was a renamed `messages`;
since nothing had been deployed, regenerating a single clean migration was the
right answer rather than inventing a rename. And driving the running app turned
up the boundary case the code alone looked fine on: with end-hour exclusive, a
09:00–10:00 and a 10:00–11:00 booking must *not* clash, or every back-to-back
class flags and the feature is noise. That boundary is now pinned by a test.

Where I ran out of road: the room list is hard-coded, and only Marie Reay 4.03
is verified real. `README.md` says which three are plausible fiction rather than
leaving a reader to assume they're all genuine — my own `CLAUDE.md` rule about
confidently-invented identifiers, applied to my own output.
