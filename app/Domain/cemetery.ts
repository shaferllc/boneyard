/**
 * Reading the graveyard.
 *
 * Kept out of the controllers because the home page, the three tier listings and
 * every grave page all want the same three things — the live sponsors, a tier's
 * graves, and a grave as the views expect it.
 */

import { Grave } from "../Models/Grave.js";
import { Sponsor } from "../Models/Sponsor.js";
import type { TierKey } from "./graveyard.js";
import type { GraveCard } from "../../resources/views/graves.js";
import type { SponsorCard } from "../../resources/views/layout.js";

/** Strip a row to what a view is allowed to render. */
export function toCard(grave: Grave): GraveCard {
  return {
    slug: grave.slug,
    name: grave.name,
    tier: grave.tier,
    slot: grave.slot,
    url: grave.url,
    logo_url: grave.logo_url,
    died: grave.died,
    cause: grave.cause,
    handle: grave.handle,
    shape: grave.shape ?? "classic",
    emblem: grave.emblem ?? "plain",
    epitaph: grave.epitaph,
    description: grave.description,
    domain_state: grave.domain_state ?? "unknown",
    domain_expires_at: grave.domain_expires_at ?? null,
    views: grave.views ?? 0,
  };
}

/**
 * Only settled graves are ever visible.
 *
 * A row is written before the buyer is sent to Stripe so the webhook has something
 * to point at, which means the table also holds abandoned checkouts. Every read
 * goes through here, so "unpaid" cannot leak onto a page by someone forgetting the
 * filter on one query.
 */
export function published() {
  return Grave.newQuery().whereNotNull("paid_at");
}

/**
 * Newest first — a graveyard that reorders itself under people is unsettling, but
 * the front row being whoever died most recently is the whole appeal.
 */
export async function gravesInTier(tier: TierKey, limit?: number): Promise<GraveCard[]> {
  const query = published().where("tier", tier).orderBy("id", "desc");
  if (limit) query.limit(limit);
  return (await query.get()).map(toCard);
}

export async function countInTier(tier: TierKey): Promise<number> {
  return published().where("tier", tier).count();
}

/**
 * The three pyramids, positioned by slot rather than packed.
 *
 * Returned as a sparse 3-array: someone who paid $200 for slot 3 keeps slot 3 even
 * while 1 and 2 stand empty. Packing them would quietly move a purchase.
 */
export async function pyramids(): Promise<(GraveCard | undefined)[]> {
  const rows = await published().where("tier", "pyramid").get();
  const bySlot: (GraveCard | undefined)[] = [undefined, undefined, undefined];

  for (const row of rows) {
    const index = (row.slot ?? 0) - 1;
    if (index >= 0 && index < bySlot.length) bySlot[index] = toCard(row);
  }

  return bySlot;
}

/**
 * Sponsors whose thirty days have not run out.
 *
 * Expiry is a `where`, not a cron sweep — nothing has to be running on schedule
 * for a lapsed sponsor to stop being shown, which is the failure mode that would
 * otherwise mean serving an ad somebody stopped paying for.
 */
export async function liveSponsors(): Promise<SponsorCard[]> {
  const rows = await Sponsor.newQuery()
    .whereNotNull("paid_at")
    .where("expires_at", ">", new Date().toISOString())
    .orderBy("id", "desc")
    .limit(10)
    .get();

  return rows.map((s) => ({
    name: s.name,
    url: s.url,
    logo_url: s.logo_url,
    tagline: s.tagline,
  }));
}

export async function liveSponsorCount(): Promise<number> {
  return Sponsor.newQuery()
    .whereNotNull("paid_at")
    .where("expires_at", ">", new Date().toISOString())
    .count();
}
