import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { type AddressInfo, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, inject, it } from "vitest";
import { ROUTES } from "./routes";

// Crit 7's published spec, in the parts a machine can hold:
//
//   "it models a slice of a real ANU system you actually deal with,
//    wired end to end"
//   "the core flow persists across a reload --- create something, and
//    it's still there"
//
// Written against the CONTRACT, not the domain: nothing below knows or cares
// which ANU system you picked, so choosing enrolment over room booking --- or
// rewriting the whole thing on Tuesday night --- doesn't touch these tests.
//
// The other three spec lines are covered elsewhere on purpose. The live
// *.fly.dev URL is checked by CI after it deploys (and by `/comp4020:ship`);
// re-checking it here would put the network inside `pnpm check`, which
// CLAUDE.md rules out. PROCESS.md and reflections/crit-7.md are checked by
// `pnpm check:evidence`. And "you can account for how you directed, grounded
// and corrected the work" is a conversation at the crit --- no test reaches it,
// so it stays yours to prepare.

// ─── The one thing you fill in ────────────────────────────────────────────
// Set these once you know what you're building. They are deliberately wrong
// on a fresh clone: these tests are meant to start red and go green as the
// app arrives, and that red-to-green is the record of the week's work.
const CREATE = {
  /** The endpoint your create form POSTs to. */
  path: "/api/REPLACE-ME",
  /** The form field carrying the new thing's identifying text. */
  field: "REPLACE-ME",
  /** Where a successful create sends the browser. */
  redirectsTo: "/",
  /** A page that lists the things you've created. */
  showsUpAt: "/",
};
// ──────────────────────────────────────────────────────────────────────────

const baseUrl = inject("baseUrl");
const placeholders = CREATE.path.includes("REPLACE-ME") || CREATE.field.includes("REPLACE-ME");

// Astro checks form POSTs carry a same-origin Origin header (CSRF
// protection); browsers send it automatically, a bare fetch doesn't.
const post = (url: string, path: string, body: URLSearchParams) =>
  fetch(new URL(path, url), {
    method: "POST",
    headers: { origin: url },
    body,
    redirect: "manual",
  });

const probe = (label: string) => `${label} ${process.hrtime.bigint()}`;

describe("the week's contract", () => {
  it("has a create flow to test (fill in CREATE above)", () => {
    expect(
      placeholders,
      "spec/crit-7.test.ts still has its REPLACE-ME placeholders — set CREATE to your app's create flow",
    ).toBe(false);
  });

  it.skipIf(placeholders)("accepts a create and redirects back", async () => {
    const res = await post(baseUrl, CREATE.path, new URLSearchParams({ [CREATE.field]: probe("create") }));

    // A POST that answers 200 with a page is usually a form that re-renders
    // its own result and breaks the back button; 303 is the flow we want.
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(CREATE.redirectsTo);
  });

  it.skipIf(placeholders)("shows what you created on a fresh load", async () => {
    const thing = probe("visible");
    await post(baseUrl, CREATE.path, new URLSearchParams({ [CREATE.field]: thing }));

    const res = await fetch(new URL(CREATE.showsUpAt, baseUrl));
    expect(res.ok).toBe(true);
    expect(await res.text()).toContain(thing);
  });

  // The one that earns its keep. A second GET proves nothing an in-memory
  // array couldn't also pass: the process never went away. "Persists across a
  // reload" means the state outlived the server, so this starts a server of
  // its own, writes through it, kills it, and starts a cold one on the same
  // database file to ask whether the thing is still there. That is the
  // difference between a prototype that survives a Fly redeploy and one that
  // quietly empties every time a machine restarts.
  it.skipIf(placeholders)("keeps it when the server is replaced", async () => {
    const dbPath = join(mkdtempSync(join(tmpdir(), "crit7-persist-")), "app.db");
    const thing = probe("durable");

    const first = await boot(dbPath);
    try {
      const res = await post(first.url, CREATE.path, new URLSearchParams({ [CREATE.field]: thing }));
      expect(res.status).toBe(303);
    } finally {
      await first.stop();
    }

    const second = await boot(dbPath);
    try {
      const res = await fetch(new URL(CREATE.showsUpAt, second.url));
      expect(
        await res.text(),
        "the thing vanished when the server restarted — state is in memory, not in the database",
      ).toContain(thing);
    } finally {
      await second.stop();
    }
  }, 30_000);
});

describe("coverage", () => {
  // CLAUDE.md's trap: the invariants only visit spec/routes.ts, so a page
  // that isn't listed is a page nothing checks. If the create flow lands
  // somewhere other than "/", that somewhere has to be covered.
  it.skipIf(placeholders)("lists the pages the core flow touches", () => {
    for (const path of new Set([CREATE.redirectsTo, CREATE.showsUpAt])) {
      expect(ROUTES, `${path} is part of the core flow but isn't in spec/routes.ts`).toContain(path);
    }
  });
});

/** Boot the built server on a free port against a given database file. */
async function boot(databasePath: string): Promise<{ url: string; stop: () => Promise<void> }> {
  const port = await new Promise<number>((resolve) => {
    const s = createServer();
    s.listen(0, () => {
      const { port } = s.address() as AddressInfo;
      s.close(() => resolve(port));
    });
  });

  const server = spawn("node", ["./dist/server/entry.mjs"], {
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), DATABASE_PATH: databasePath },
    stdio: "ignore",
  });

  const url = `http://127.0.0.1:${port}`;
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {
      // not up yet
    }
    if (attempt >= 50) {
      server.kill();
      throw new Error(`server did not come up at ${url}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return {
    url,
    stop: () =>
      new Promise<void>((resolve) => {
        server.once("exit", () => resolve());
        server.kill();
      }),
  };
}
