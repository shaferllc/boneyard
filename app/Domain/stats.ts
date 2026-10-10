/**
 * How many times the site has been looked at.
 *
 * Deliberately one number. Per-page breakdowns, uniques, referrers and sessions
 * are analytics, and analytics is a product — this is a line in the footer of a
 * joke website, and the honest version of it is a single integer that only ever
 * goes up.
 */

import { db } from "@shaferllc/keel/core";

const SITE_VIEWS = "site_views";

/**
 * Is this URL a page a person is looking at?
 *
 * Assets, the webhook, the health check and the sitemap all arrive at the Worker
 * and none of them are a visit. Pure and separate from the request so the rules
 * are testable — this is the whole definition of the number, and a wrong answer
 * here is a footer that quietly counts every stylesheet fetch.
 */
export function isPageRequest(pathname: string): boolean {
  if (pathname === "/stripe/webhook" || pathname === "/health" || pathname === "/sitemap.xml") return false;

  // Anything with an extension is an asset: /assets/app.css, /og.png, /favicon.svg.
  const last = pathname.split("/").pop() ?? "";
  if (last.includes(".")) return false;

  return true;
}

/** One more. Atomic, so concurrent readers cannot overwrite each other. */
export async function recordPageView(): Promise<void> {
  await db("counters").where("key", SITE_VIEWS).increment("value");
}

/**
 * The current total, or null if it cannot be read.
 *
 * Null rather than throwing, and null renders nothing: this is read while
 * building the footer of *every* page, and a counter that is briefly unavailable
 * must not be able to 500 the entire site over a number nobody needs.
 */
export async function totalPageViews(): Promise<number | null> {
  try {
    const row = (await db("counters").where("key", SITE_VIEWS).first()) as { value?: number } | undefined;
    return typeof row?.value === "number" ? row.value : null;
  } catch {
    return null;
  }
}
