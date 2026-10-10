import type { Ctx } from "@shaferllc/keel/core";

import { totalPageViews } from "../Domain/stats.js";
import { config, db, view } from "@shaferllc/keel/core";

import Bury from "../../resources/views/bury.js";
import { Grave } from "../Models/Grave.js";
import { createCheckoutSession, mayBypassPayment, paymentsUnavailable } from "../Domain/stripe.js";
import {
  clamp,
  deathDate,
  isEmblem,
  isShape,
  isTier,
  logoFor,
  normalizeHandle,
  normalizeUrl,
  PYRAMID_SLOTS,
  slugify,
  TIER,
  type TierKey,
} from "../Domain/graveyard.js";

/**
 * How long an unpaid pyramid may sit on a slot.
 *
 * Pyramids are the only tier that can be sold out, so an abandoned checkout there
 * takes a $200 plot off the market. Anything older than this is released the next
 * time someone tries to buy — no scheduled job, and nothing to go wrong while
 * nobody is buying anyway.
 */
const HOLD_MINUTES = 30;

/** What each tier is allowed to carry. Anything above its tier is dropped. */
function fieldsFor(tier: TierKey, epitaph: string | null, description: string | null) {
  if (tier === "mass") return { epitaph: null, description: null };
  if (tier === "tomb") return { epitaph, description: null };
  return { epitaph, description };
}

export class BuryController {
  async show(c: Ctx) {
    const tier = isTier(c.req.query("tier")) ? (c.req.query("tier") as TierKey) : "tomb";
    const slot = Number(c.req.query("slot"));

    return c.html(
      await view(Bury, { siteViews: await totalPageViews(),
        tier,
        slot: tier === "pyramid" && slot >= 1 && slot <= PYRAMID_SLOTS ? slot : null,
        // Someone who backed out of Stripe lands here again; say so rather than
        // showing them a blank form and letting them wonder what happened.
        errors: c.req.query("cancelled") ? ["Payment cancelled — nothing was buried."] : [],
      }),
    );
  }

  async store(c: Ctx) {
    const body = await c.req.parseBody();
    const errors: string[] = [];

    const name = clamp(body.name, 80);
    if (!name) errors.push("A startup needs a name to be buried under.");

    const tier: TierKey = isTier(body.tier) ? body.tier : "mass";

    // Pyramids are the only tier with a fixed number of plots, so this is the only
    // place that can sell out. Checked here for the error message; the unique index
    // on `slot` is what actually stops two buyers landing on the same one.
    let slot: number | null = null;
    if (tier === "pyramid") {
      await this.releaseStaleHolds();

      const wanted = Number(body.slot);
      slot = wanted >= 1 && wanted <= PYRAMID_SLOTS ? wanted : await this.firstFreeSlot();

      if (slot === null) errors.push("All three pyramids are taken. They are not coming back.");
      else if (await Grave.newQuery().where("slot", slot).first()) {
        errors.push(`Pyramid ${slot} was claimed while you were filling this in.`);
      }
    }

    if (errors.length > 0 || !name) {
      return c.html(
        await view(Bury, { siteViews: await totalPageViews(),
          tier,
          slot,
          errors: errors.length ? errors : ["Something in the form was not accepted."],
          values: Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v ?? "")])),
        }),
      );
    }

    const url = normalizeUrl(body.url);
    const { epitaph, description } = fieldsFor(tier, clamp(body.epitaph, 120), clamp(body.description, 600));
    const price = TIER[tier].price;

    // Production with no Stripe key: refuse the sale rather than complete it for
    // nothing. Loud beats generous.
    if (price > 0 && paymentsUnavailable()) {
      return c.html(
        await view(Bury, { siteViews: await totalPageViews(),
          tier,
          slot,
          errors: ["Paid burials are temporarily unavailable. The mass grave is still free."],
          values: Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v ?? "")])),
        }),
      );
    }


    // The free tier never touches Stripe, and neither does a local run with no keys
    // set. Everything else is written unpaid and stays invisible until the webhook
    // settles it.
    const settleNow = price === 0 || mayBypassPayment();

    const grave = await Grave.create({
      slug: await this.freeSlug(name),
      name,
      tier,
      slot,
      url,
      logo_url: logoFor(url),
      died: deathDate(body.month, body.year),
      cause: clamp(body.cause, 40),
      handle: normalizeHandle(body.handle),
      shape: isShape(body.shape) ? body.shape : "classic",
      emblem: isEmblem(body.emblem) ? body.emblem : "plain",
      epitaph,
      description,
      paid_at: settleNow ? new Date().toISOString() : null,
    });

    if (settleNow) {
      // Mass-grave residents have no page of their own; send them to the pit.
      return c.redirect(tier === "mass" ? "/graves/mass-grave" : `/grave/${grave.slug}`);
    }

    const site = config<string>("app.url", "http://localhost:3000");

    try {
      const checkout = await createCheckoutSession({
        reference: `grave:${grave.id}`,
        name: `${TIER[tier].label} — ${name}`,
        description: TIER[tier].blurb,
        dollars: price,
        successUrl: `${site}/grave/${grave.slug}`,
        cancelUrl: `${site}/bury?tier=${tier}${slot ? `&slot=${slot}` : ""}&cancelled=1`,
        metadata: { tier, slug: grave.slug },
      });

      return c.redirect(checkout);
    } catch (error) {
      // Stripe refused. Drop the hold rather than leaving a dead row holding a
      // pyramid slot, and tell the buyer the truth.
      console.error("checkout failed", error);
      await grave.delete();

      return c.html(
        await view(Bury, { siteViews: await totalPageViews(),
          tier,
          slot,
          errors: ["Checkout could not be opened. Nothing was charged — try again in a moment."],
          values: Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v ?? "")])),
        }),
      );
    }
  }

  /** Give up unpaid pyramid holds older than `HOLD_MINUTES`. */
  private async releaseStaleHolds(): Promise<void> {
    const cutoff = new Date(Date.now() - HOLD_MINUTES * 60_000).toISOString();

    // `db()` rather than the model query: deletion by condition is a query-builder
    // operation, and there are no model events worth firing for an abandoned hold.
    await db("graves").where("tier", "pyramid").whereNull("paid_at").where("created_at", "<", cutoff).delete();
  }

  /** Lowest unclaimed pyramid, or null when all three are gone. */
  private async firstFreeSlot(): Promise<number | null> {
    const taken = new Set((await Grave.newQuery().where("tier", "pyramid").get()).map((g) => g.slot));
    for (let n = 1; n <= PYRAMID_SLOTS; n++) if (!taken.has(n)) return n;
    return null;
  }

  /**
   * `uniqueSlug` wants a synchronous "is it taken?", so the candidates are fetched
   * in one query first rather than one round trip per attempt.
   */
  private async freeSlug(name: string): Promise<string> {
    const base = slugify(name);
    const rows = await Grave.newQuery().where("slug", "like", `${base}%`).get();
    const taken = new Set(rows.map((r) => r.slug));

    if (!taken.has(base)) return base;
    for (let n = 2; n < 1000; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
    throw new Error(`no free slug for "${name}"`);
  }
}
