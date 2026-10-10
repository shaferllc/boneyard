import assert from "node:assert/strict";
import { test } from "node:test";

import {
  deathDate,
  formatDeath,
  logoFor,
  normalizeHandle,
  normalizeUrl,
  slugify,
  uniqueSlug,
} from "../app/Domain/graveyard.js";

test("slugs keep the domain readable", () => {
  assert.equal(slugify("Robid.lol"), "robid-lol");
  assert.equal(slugify("  Pushup RPG!! "), "pushup-rpg");
  assert.equal(slugify("???"), "unnamed");
});

test("a taken slug gets a number, and only the taken one does", () => {
  const taken = new Set(["loopr", "loopr-2"]);
  assert.equal(uniqueSlug("Loopr", (s) => taken.has(s)), "loopr-3");
  assert.equal(uniqueSlug("Vively", (s) => taken.has(s)), "vively");
});

test("a date of death is YYYY-MM or nothing at all", () => {
  assert.equal(deathDate("3", "2024"), "2024-03");
  assert.equal(deathDate("13", "2024"), null, "month 13 is not a month");
  assert.equal(deathDate("", ""), null);
  assert.equal(deathDate("3", "1200"), null, "startups did not exist in 1200");
  assert.equal(formatDeath("2024-03"), "Mar 2024");
  assert.equal(formatDeath(null), "?");
});

test("a bare domain is assumed to be https, and junk is rejected", () => {
  assert.equal(normalizeUrl("loopr.io"), "https://loopr.io/".replace(/\/$/, ""));
  assert.equal(normalizeUrl("https://loopr.io/x/"), "https://loopr.io/x");
  assert.equal(normalizeUrl("not a url"), null);
  assert.equal(normalizeUrl("localhost"), null, "no dot, no domain");
  assert.equal(normalizeUrl(""), null);
});

test("logos are derived from the hostname only", () => {
  assert.equal(logoFor("https://loopr.io/pricing"), "https://www.google.com/s2/favicons?domain=loopr.io&sz=128");
  assert.equal(logoFor(null), null);
});

test("handles are stripped to the handle", () => {
  assert.equal(normalizeHandle("@founder"), "founder");
  assert.equal(normalizeHandle("https://x.com/founder"), "founder");
  assert.equal(normalizeHandle("not a handle"), null);
  assert.equal(normalizeHandle("@waaaaaaaaaaaaaaaytoolong"), null);
});

/* ------------------------------------------------------------------ stripe */

import { verifyWebhook } from "../app/Domain/stripe.js";

const SECRET = "whsec_test_secret";
const BODY = '{"type":"checkout.session.completed","data":{"object":{"id":"cs_1"}}}';

/** Sign a body the way Stripe does, so the verifier is tested against real input. */
async function sign(body: string, secret: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

test("a correctly signed webhook verifies", async () => {
  const now = 1_700_000_000_000;
  const header = await sign(BODY, SECRET, now / 1000);
  assert.equal(await verifyWebhook(BODY, header, SECRET, 300, now), true);
});

test("a webhook signed with the wrong secret is refused", async () => {
  const now = 1_700_000_000_000;
  const header = await sign(BODY, "whsec_attacker", now / 1000);
  assert.equal(await verifyWebhook(BODY, header, SECRET, 300, now), false);
});

test("a tampered body is refused even with a real signature", async () => {
  const now = 1_700_000_000_000;
  const header = await sign(BODY, SECRET, now / 1000);
  assert.equal(await verifyWebhook(BODY.replace("cs_1", "cs_2"), header, SECRET, 300, now), false);
});

test("an old signature is refused, so a captured request cannot be replayed", async () => {
  const now = 1_700_000_000_000;
  const header = await sign(BODY, SECRET, now / 1000 - 3600);
  assert.equal(await verifyWebhook(BODY, header, SECRET, 300, now), false);
});

test("a missing header or secret is refused rather than waved through", async () => {
  const now = 1_700_000_000_000;
  const header = await sign(BODY, SECRET, now / 1000);
  assert.equal(await verifyWebhook(BODY, null, SECRET, 300, now), false);
  assert.equal(await verifyWebhook(BODY, header, "", 300, now), false);
  assert.equal(await verifyWebhook(BODY, "garbage", SECRET, 300, now), false);
  assert.equal(await verifyWebhook(BODY, "t=abc,v1=def", SECRET, 300, now), false);
});

/**
 * The one that would cost real money if it broke: a production deploy whose Stripe
 * key never got set must refuse a $200 pyramid, not hand it over.
 */
test("production without Stripe keys refuses paid tiers instead of giving them away", async () => {
  const { mayBypassPayment, paymentsUnavailable, stripeConfigured } = await import("../app/Domain/stripe.js");
  const { Application, Config } = await import("@shaferllc/keel/core");

  // Constructing an Application makes it the active one, which is what `config()`
  // resolves through — so rebinding Config on it is enough to drive these.
  const application = new Application(process.cwd());
  const configure = (env: string, secret: string) =>
    application.instance(Config, new Config({ app: { env }, stripe: { secret } }));

  configure("local", "");
  assert.equal(mayBypassPayment(), true, "local with no keys stays usable");
  assert.equal(paymentsUnavailable(), false);

  configure("production", "");
  assert.equal(mayBypassPayment(), false, "production never hands out a paid tier free");
  assert.equal(paymentsUnavailable(), true);

  configure("production", "sk_live_x");
  assert.equal(stripeConfigured(), true);

  // A restricted key is a configured key; treating it as unset takes payments
  // down for the narrower-scoped credential we actually want deployed.
  configure("production", "rk_live_x");
  assert.equal(stripeConfigured(), true, "restricted keys count as configured");
  assert.equal(paymentsUnavailable(), false, "configured production sells normally");
});
