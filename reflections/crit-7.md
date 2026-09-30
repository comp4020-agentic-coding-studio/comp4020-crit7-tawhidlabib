# Crit 7 — Build the ANU system you wish existed

**The breakthrough was writing the persistence test before there was anything to
persist.** I nearly wrote the obvious version: create something, fetch the page
again, assert it's there. That passes against an array in memory. The spec line
says "persists across a reload", and a reload of the *page* is not what makes a
booking survive a Fly machine restarting at 3am. So the test boots a server,
writes through it, kills it, and boots a cold one on the same database file.

Having written it a week before the app existed, I then built against it, and
the app was right the first time — not because I was careful, but because the
question had already been asked precisely. The test did the thinking; the build
was forty-five minutes of following it.

The limit of that showed up an hour later. Everything the test asked about was
right, and the page was still wrong: a list with a warning badge on each
colliding row, *telling* you two bookings collide while showing you nothing —
the exact failure my README accuses the real system of. My test couldn't have
caught it, because I'd only thought to specify what the app knows, not what it
shows. Rebuilding the page as a timetable, where an overlap physically cannot
share a row and stacks beneath what it clashes with, is the version that makes
the argument instead of asserting it.

**What it changed: I've stopped treating tests as verification.** For six weeks
I wrote them after the fact, checking that what I'd built did what I thought.
This week the test was the specification, written while I still had opinions and
no code to defend, and it caught the thing I'd have got wrong under time
pressure. The other catch came the same way — driving the running app surfaced
that back-to-back bookings must not flag as clashes, which reading the handler
would never have shown me.

The developer I want to be is the one who decides what "correct" means before
there's an implementation to be loyal to. I also want to be one who doesn't
build at 11am on the cutoff — the setup being done a week early is the only
reason this worked at all, and I don't want to test that margin again.
