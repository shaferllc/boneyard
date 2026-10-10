/**
 * Does the dead startup's domain still exist?
 *
 * The rest of the graveyard is what someone typed into a form. This is the one
 * part that checks reality: RDAP is the registry's own machine-readable WHOIS, so
 * a nightly sweep can ask every grave's domain when its registration runs out and
 * let the headstone rot in step with it.
 *
 * The rule that matters is in `readFacts`: **a lookup that fails changes nothing.**
 * A rate-limited or timed-out request must never be read as "the domain is gone",
 * or one bad night crumbles the entire graveyard and the sweep has no way back —
 * the previous expiry date is already overwritten.
 */

import { Grave } from "../Models/Grave.js";

export const DECAY_STATES = ["unknown", "alive", "expiring", "lapsed"] as const;
export type DecayState = (typeof DECAY_STATES)[number];

/** Inside this many days of expiry, a stone starts to crack. */
export const EXPIRING_DAYS = 30;

/** How long a grave keeps its answer before the sweep asks again. */
export const RECHECK_HOURS = 20;

export interface DomainFacts {
  /** Does the registry have a record at all? */
  registered: boolean;
  /** ISO instant, or null when the registry published no expiration event. */
  expiresAt: string | null;
}

/** Whole days until expiry; negative once it has passed. Null if undatable. */
export function daysUntil(expiresAt: string | null, now: number = Date.now()): number | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return null;
  return Math.floor((ms - now) / 86_400_000);
}

/**
 * Registry facts → how far gone the stone is.
 *
 * Pure, and separate from the fetch, because this is the half worth testing: the
 * boundaries between alive and expiring and lapsed are the whole feature, and they
 * are impossible to exercise through a live RDAP call.
 */
export function decayState(facts: DomainFacts, now: number = Date.now()): DecayState {
  if (!facts.registered) return "lapsed";

  const days = daysUntil(facts.expiresAt, now);
  // Registered, but the registry publishes no expiry — .ai and friends. Known to
  // be alive, unknown how long for, and inventing a date would print as fact.
  if (days === null) return "alive";

  if (days <= 0) return "lapsed";
  return days <= EXPIRING_DAYS ? "expiring" : "alive";
}

/** `https://foo.co/x` → `foo.co`. Null for anything that is not a URL. */
export function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try {
    // ponytail: strips a leading `www.` only. A grave at `blog.foo.co.uk` is
    // looked up as written and will 404 at the registry; swap in the public
    // suffix list if people start burying subdomains.
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * Ask RDAP about one domain.
 *
 * Returns null for "no answer" — which is not the same as "no domain", and the
 * caller must leave the row untouched rather than write a state from it. 404 is
 * the one negative that is trustworthy: the registry answered, and it has no
 * record.
 */
export async function readFacts(url: string | null, fetcher: typeof fetch = fetch): Promise<DomainFacts | null> {
  const host = hostnameOf(url);
  if (!host) return null;

  let response: Response;
  try {
    response = await fetcher(`https://rdap.org/domain/${encodeURIComponent(host)}`, {
      headers: {
        accept: "application/rdap+json",
        // Identifying the caller is the price of a free public registry service —
        // an anonymous request from a datacentre range is the shape of a scraper,
        // and gets treated as one.
        "user-agent": "boneyard.online domain watch (+https://boneyard.online)",
      },
    });
  } catch (error) {
    console.warn(`rdap ${host}: threw ${String(error)}`);
    return null;
  }

  if (response.status === 404) {
    // Two very different things arrive as 404, and telling them apart is the
    // difference between a working feature and a graveyard that buries every
    // `.io` on its first night:
    //
    //   "Not Found" / "…is available for registration"  → really unregistered
    //   "No RDAP service is available for this resource" → the TLD has no RDAP
    //     server at all (`.io` today), and the domain is very likely alive
    //
    // The second is an absence of information, so it has to read as "no answer".
    const body = (await response.json().catch(() => null)) as { title?: string } | null;
    if (/no rdap service/i.test(body?.title ?? "")) return null;
    return { registered: false, expiresAt: null };
  }

  if (!response.ok) {
    // Logged, not swallowed: "the sweep did nothing" and "the sweep could not
    // reach the registry" look identical in the data otherwise.
    console.warn(`rdap ${host}: HTTP ${response.status}`);
    return null;
  }

  let body: { events?: Array<{ eventAction?: string; eventDate?: string }> };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return null;
  }

  const expiry = body.events?.find((e) => e.eventAction === "expiration");
  return { registered: true, expiresAt: expiry?.eventDate ?? null };
}

/**
 * Sweep every grave that has a URL.
 *
 * Sequential on purpose: this is a few dozen rows once a night against a free
 * public endpoint, and a burst of parallel requests is the one thing that would
 * get us rate-limited into returning null for all of them.
 *
 * ponytail: full-table scan per run. Fine to a few thousand graves; add a
 * `WHERE domain_checked_at < ?` index when it stops being.
 */
export async function sweepDomains(
  now: number = Date.now(),
  fetcher: typeof fetch = fetch,
): Promise<{ checked: number; updated: number; failed: number }> {
  // Unpaid rows are invisible on every page, so there is nothing to decay.
  const graves = await Grave.newQuery().whereNotNull("paid_at").whereNotNull("url").get();
  let checked = 0;
  let updated = 0;
  let failed = 0;

  for (const grave of graves as Grave[]) {
    const last = grave.domain_checked_at ? Date.parse(grave.domain_checked_at) : NaN;
    if (Number.isFinite(last) && now - last < RECHECK_HOURS * 3_600_000) continue;

    checked++;
    const facts = await readFacts(grave.url, fetcher);
    if (!facts) {
      failed++;
      continue;
    }

    grave.domain_state = decayState(facts, now);
    grave.domain_expires_at = facts.expiresAt;
    grave.domain_checked_at = new Date(now).toISOString();
    await grave.save();
    updated++;
  }

  return { checked, updated, failed };
}

/**
 * The one line the headstone shows. Null for `unknown`, which is how the feature
 * stays invisible on a grave the sweep has not reached yet — no flag needed, the
 * absence of data is the flag.
 */
export function decayLabel(
  state: DecayState,
  expiresAt: string | null,
  now: number = Date.now(),
): string | null {
  if (state === "unknown") return null;
  if (state === "lapsed") return "Domain lapsed";

  const days = daysUntil(expiresAt, now);
  // Registered with no published expiry: say that, rather than a number we do
  // not have.
  if (days === null) return "Domain still registered";

  return `Domain expires in ${days} day${days === 1 ? "" : "s"}`;
}
