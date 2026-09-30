# Room bookings that admit when they clash

Book a teaching room at ANU, and this shows you every other booking that wants
the same room at the same time — including the one that would otherwise sit
silently in the database until two people turn up to teach in the same place.

That silence is the whole complaint. The system this replaces takes a booking,
says nothing, and the clash surfaces as a person standing in a doorway. So this
prototype refuses to hide it: a colliding booking is stored like any other, and
both sides of the collision are marked on the page.

## What good looks like here

**A clash is data, not an error.** The obvious design is to reject a double
booking on submit. I decided against it, and the decision shaped the schema:
there is deliberately no unique constraint on `(room, day, hours)`. Rejecting a
clash tells the second person "no" and tells the first person nothing — the
information ends up with neither. Storing it and showing it puts the conflict in
front of both, which is the thing the real system fails to do. If this grew, the
next step would be notifying the earlier booker, not adding the constraint.

**End hour is exclusive.** A 09:00–10:00 and a 10:00–11:00 booking do not
clash. This is the off-by-one that would make the feature useless by flagging
every back-to-back class, so `spec/crit-7.test.ts` pins the boundary.

**Persistence means surviving the process, not the page.** The spec asks that
the core flow persist across a reload. A second `GET` would prove that against
an in-memory array, so the test boots a server, writes, kills it, and boots a
cold one on the same SQLite file. That is what has to hold when Fly restarts
the machine.

### What's real and what isn't

The rooms are a fixed list of four. **Marie Reay 4.03** is real — it's where
this course's crits run. The other three (`Marie Reay 5.02`, `Marie Reay 6.05`,
`Hanna Neumann 1.21`) are plausible and **unverified**: they follow ANU's
building-and-floor naming, but I have not checked them against the room
database. A real version reads the room list from that database rather than
hard-coding names, and `CLAUDE.md` records why this exact shape of detail — the
kind a model produces confidently and gets subtly wrong — is the thing to
distrust.

There are no people, courses or timetables in here. One table, one create flow,
one question answered.

### Enforced, versus judgement

`spec/crit-7.test.ts` holds the create flow, the redirect, visibility on reload,
survival across a server restart, and route coverage. `spec/invariants.test.ts`
holds the accessibility floor — and that floor runs in jsdom, so contrast and
overlap are *not* checked. Whether the clash warning is actually noticeable, and
whether "book a room" is the slice most worth fixing, are judgement calls no
test here reaches.

## Running it

```sh
mise install && pnpm install
pnpm dev     # http://localhost:4321/
pnpm check   # types, build, and the spec suite against the built server
```

State lives in SQLite: `.data/app.db` locally, the machine's volume at `/data`
in production. Change `src/lib/schema.ts`, then `pnpm db:generate`, and commit
the migration it writes.
