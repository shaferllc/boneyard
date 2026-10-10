/**
 * The view counter's one piece of judgement: who counts as a visitor.
 *
 * The increment itself is `increment()` on the query builder and needs no test of
 * ours. What is worth pinning down is the filter, because it errs deliberately —
 * a missed human costs nothing, a counted crawler makes the whole number a lie.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { looksAutomated, formatViews } from "../app/Domain/graveyard.js";

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

test("real browsers count", () => {
  assert.equal(looksAutomated(CHROME), false);
  assert.equal(looksAutomated(SAFARI_IOS), false);
});

test("crawlers and link unfurlers do not", () => {
  for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "facebookexternalhit/1.1",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "TelegramBot (like TwitterBot)",
    "curl/8.7.1",
    "python-requests/2.32.3",
    "Mozilla/5.0 HeadlessChrome/140.0",
  ]) {
    assert.equal(looksAutomated(ua), true, ua);
  }
});

test("a missing user-agent is a script, not a shy browser", () => {
  assert.equal(looksAutomated(null), true);
  assert.equal(looksAutomated(undefined), true);
  assert.equal(looksAutomated("   "), true);
});

test("counts are formatted, and never negative", () => {
  assert.equal(formatViews(0), "0");
  assert.equal(formatViews(1204), "1,204");
  assert.equal(formatViews(-5), "0");
});

/* ------------------------------------------------ what counts as a page view */

import { isPageRequest } from "../app/Domain/stats.js";

test("pages count", () => {
  for (const p of ["/", "/bury", "/sponsor", "/graves/tombs", "/grave/quibbly", "/grave/some-slug"]) {
    assert.equal(isPageRequest(p), true, p);
  }
});

test("assets, webhooks and probes do not", () => {
  // Every one of these reaches the Worker, and none of them is a person looking
  // at the graveyard.
  for (const p of ["/assets/app.css", "/og.png", "/favicon.svg", "/stripe/webhook", "/health", "/sitemap.xml"]) {
    assert.equal(isPageRequest(p), false, p);
  }
});

test("a slug containing a dot is still not a page", () => {
  // Slugs are [a-z0-9-] so this cannot happen today; the rule is extension-based
  // and this pins down which way it errs if that ever changes.
  assert.equal(isPageRequest("/grave/foo.io"), false);
});
