import type { Ctx } from "@shaferllc/keel/core";

import { totalPageViews } from "../Domain/stats.js";
import { config, view } from "@shaferllc/keel/core";

import SponsorPage from "../../resources/views/sponsor.js";
import { Sponsor } from "../Models/Sponsor.js";
import { liveSponsorCount } from "../Domain/cemetery.js";
import { createCheckoutSession, mayBypassPayment, paymentsUnavailable } from "../Domain/stripe.js";
import { clamp, logoFor, normalizeUrl, SPONSOR_DAYS, SPONSOR_PLOTS, SPONSOR_PRICE } from "../Domain/graveyard.js";

/** Thirty days from `from`, as an ISO instant. */
export function sponsorExpiry(from: number = Date.now()): string {
  return new Date(from + SPONSOR_DAYS * 86_400_000).toISOString();
}

export class SponsorController {
  async show(c: Ctx) {
    return c.html(
      await view(SponsorPage, { siteViews: await totalPageViews(),
        taken: await liveSponsorCount(),
        errors: c.req.query("cancelled") ? ["Payment cancelled — the plot is still free."] : [],
      }),
    );
  }

  async store(c: Ctx) {
    const body = await c.req.parseBody();
    const values = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v ?? "")]));
    const errors: string[] = [];

    const name = clamp(body.name, 80);
    const url = normalizeUrl(body.url);
    const taken = await liveSponsorCount();

    if (!name) errors.push("A sponsor needs a name.");
    if (!url) errors.push("That does not look like a website.");
    if (taken >= SPONSOR_PLOTS) errors.push("Every plot is taken right now.");

    if (paymentsUnavailable()) errors.push("Sponsorship is temporarily unavailable — try again shortly.");

    if (errors.length > 0 || !name || !url) {
      return c.html(await view(SponsorPage, { siteViews: await totalPageViews(), taken, errors, values }));
    }

    const settleNow = mayBypassPayment();

    // `expires_at` is provisional until the webhook rewrites it from the moment the
    // money actually cleared — a buyer who sits on the Stripe page for ten minutes
    // should not lose ten minutes of the thirty days they paid for.
    const sponsor = await Sponsor.create({
      name,
      url,
      logo_url: normalizeUrl(body.logo_url) ?? logoFor(url),
      tagline: clamp(body.tagline, 200),
      expires_at: sponsorExpiry(),
      paid_at: settleNow ? new Date().toISOString() : null,
    });

    if (settleNow) return c.redirect("/");

    const site = config<string>("app.url", "http://localhost:3000");

    try {
      const checkout = await createCheckoutSession({
        reference: `sponsor:${sponsor.id}`,
        name: `Sponsor plot — ${name}`,
        description: `${SPONSOR_DAYS} days in the graveyard's sidebars and top bar.`,
        dollars: SPONSOR_PRICE,
        successUrl: `${site}/?sponsored=1`,
        cancelUrl: `${site}/sponsor?cancelled=1`,
        metadata: { sponsor: name },
      });

      return c.redirect(checkout);
    } catch (error) {
      console.error("sponsor checkout failed", error);
      await sponsor.delete();

      return c.html(
        await view(SponsorPage, { siteViews: await totalPageViews(),
          taken,
          errors: ["Checkout could not be opened. Nothing was charged — try again in a moment."],
          values,
        }),
      );
    }
  }
}
