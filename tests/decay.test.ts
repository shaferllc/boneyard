/**
 * The domain watch.
 *
 * Everything here is the pure half: the alive/expiring/lapsed boundaries, and the
 * rule that a failed lookup returns null so the sweep leaves the row alone. Both
 * are impossible to exercise against live RDAP, and both are the parts that would
 * quietly ruin the graveyard if they were wrong.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { decayState, decayLabel, daysUntil, hostnameOf, readFacts, EXPIRING_DAYS } from "../app/Domain/decay.js";

const NOW = Date.parse("2026-06-01T00:00:00.000Z");
const inDays = (n: number) => new Date(NOW + n * 86_400_000).toISOString();

test("a comfortably-registered domain is alive", () => {
  assert.equal(decayState({ registered: true, expiresAt: inDays(200) }, NOW), "alive");
});

test("the expiring boundary is inclusive, and one day past it is not", () => {
  assert.equal(decayState({ registered: true, expiresAt: inDays(EXPIRING_DAYS) }, NOW), "expiring");
  assert.equal(decayState({ registered: true, expiresAt: inDays(EXPIRING_DAYS + 1) }, NOW), "alive");
});

test("expiry in the past is lapsed, not expiring", () => {
  assert.equal(decayState({ registered: true, expiresAt: inDays(-1) }, NOW), "lapsed");
  assert.equal(decayState({ registered: true, expiresAt: inDays(0) }, NOW), "lapsed");
});

test("no registry record at all is lapsed", () => {
  assert.equal(decayState({ registered: false, expiresAt: null }, NOW), "lapsed");
});

test("registered with no published expiry is alive, never lapsed", () => {
  // .ai and friends publish no expiration event. Reading that as death would bury
  // every one of them on the first sweep.
  assert.equal(decayState({ registered: true, expiresAt: null }, NOW), "alive");
  assert.equal(decayState({ registered: true, expiresAt: "not-a-date" }, NOW), "alive");
});

test("a lookup that fails returns null so the caller writes nothing", async () => {
  const boom = async () => {
    throw new Error("network");
  };
  assert.equal(await readFacts("https://foo.co", boom as unknown as typeof fetch), null);

  const rateLimited = async () => new Response("slow down", { status: 429 });
  assert.equal(await readFacts("https://foo.co", rateLimited as unknown as typeof fetch), null);

  const garbage = async () => new Response("<html>", { status: 200 });
  assert.equal(await readFacts("https://foo.co", garbage as unknown as typeof fetch), null);
});

test("404 is the one negative the registry can be trusted on", async () => {
  const gone = async () => new Response("", { status: 404 });
  assert.deepEqual(await readFacts("https://foo.co", gone as unknown as typeof fetch), {
    registered: false,
    expiresAt: null,
  });
});

test("a TLD with no RDAP server is not a dead domain", async () => {
  // `.io` answers this way today. Reading it as death would lapse every .io grave
  // on the first sweep.
  const noService = async () =>
    new Response(JSON.stringify({ errorCode: 404, title: "No RDAP service is available for this resource" }), {
      status: 404,
    });
  assert.equal(await readFacts("https://foo.io", noService as unknown as typeof fetch), null);
});

test("an expiration event is read out of the RDAP payload", async () => {
  const ok = async () =>
    new Response(
      JSON.stringify({
        events: [
          { eventAction: "registration", eventDate: "2019-01-01T00:00:00Z" },
          { eventAction: "expiration", eventDate: "2027-01-01T00:00:00Z" },
        ],
      }),
      { status: 200 },
    );
  assert.deepEqual(await readFacts("https://foo.co", ok as unknown as typeof fetch), {
    registered: true,
    expiresAt: "2027-01-01T00:00:00Z",
  });
});

test("hostnames are normalised, and non-URLs are refused", () => {
  assert.equal(hostnameOf("https://www.foo.co/bar"), "foo.co");
  assert.equal(hostnameOf("https://foo.co"), "foo.co");
  assert.equal(hostnameOf("not a url"), null);
  assert.equal(hostnameOf(null), null);
});

test("unknown renders nothing, which is how the feature stays hidden", () => {
  assert.equal(decayLabel("unknown", null, NOW), null);
  assert.equal(decayLabel("lapsed", null, NOW), "Domain lapsed");
  assert.equal(decayLabel("alive", inDays(43), NOW), "Domain expires in 43 days");
  assert.equal(decayLabel("expiring", inDays(1), NOW), "Domain expires in 1 day");
  assert.equal(decayLabel("alive", null, NOW), "Domain still registered");
});

test("daysUntil floors toward the past so a stone never rots early", () => {
  assert.equal(daysUntil(inDays(1.9), NOW), 1);
  assert.equal(daysUntil(null, NOW), null);
});
