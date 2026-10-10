import type { Ctx } from "@shaferllc/keel/core";

import { totalPageViews } from "../Domain/stats.js";
import { config, db, view } from "@shaferllc/keel/core";

import Home from "../../resources/views/home.js";
import ListPage from "../../resources/views/list.js";
import GravePage from "../../resources/views/grave.js";
import { Grave } from "../Models/Grave.js";
import { countInTier, gravesInTier, liveSponsors, pyramids, toCard } from "../Domain/cemetery.js";
import { looksAutomated } from "../Domain/graveyard.js";
import type { TierKey } from "../Domain/graveyard.js";

/** How much of each tier the front page shows before sending you to its listing. */
const ON_HOME = { mausoleum: 5, tomb: 12, mass: 24 } as const;

export class GraveyardController {
  async index(c: Ctx) {
    const [sponsors, pyramidSlots, mausoleums, tombs, massGrave, massTotal] = await Promise.all([
      liveSponsors(),
      pyramids(),
      gravesInTier("mausoleum", ON_HOME.mausoleum),
      gravesInTier("tomb", ON_HOME.tomb),
      gravesInTier("mass", ON_HOME.mass),
      countInTier("mass"),
    ]);

    return c.html(
      await view(Home, { siteViews: await totalPageViews(), sponsors, pyramids: pyramidSlots, mausoleums, tombs, massGrave, massTotal }),
    );
  }

  /** The three tier listings. Which one is decided by the route, not the query. */
  list(tier: Exclude<TierKey, "pyramid">) {
    return async (c: Ctx) => {
      const [sponsors, graves] = await Promise.all([liveSponsors(), gravesInTier(tier)]);
      return c.html(await view(ListPage, { siteViews: await totalPageViews(), tier, graves, sponsors }));
    };
  }

  async show(c: Ctx) {
    const grave = await Grave.newQuery().where("slug", c.req.param("slug") ?? "").first();
    if (!grave) return c.notFound();

    // An unpaid grave is served, not hidden: Stripe's redirect regularly beats its
    // own webhook, and bouncing a buyer to a 404 seconds after they paid is the
    // worst possible moment to be pedantic. It carries a settling notice and a
    // noindex instead, and stays out of every listing until the webhook lands.
    const settling = grave.paid_at === null;

    // Counted before the page is built, and only for graves that are actually
    // bought — a settling grave's only visitor is the buyer refreshing to see
    // whether Stripe has landed yet, and counting that is just noise.
    //
    // `increment` rather than read-modify-write: two people opening the same
    // grave at once would otherwise both write the same number back.
    if (!settling && !looksAutomated(c.req.header("user-agent"))) {
      await db("graves").where("id", grave.id).increment("views");
      grave.views = (grave.views ?? 0) + 1;
    }

    // Neighbours: other paid headstones, never this one. `mass` is excluded because
    // a mass-grave resident has no page to click through to.
    const nearby = await Grave.newQuery()
      .whereNotNull("paid_at")
      .whereIn("tier", ["tomb", "mausoleum", "pyramid"])
      .where("id", "!=", grave.id)
      .orderBy("id", "desc")
      .limit(6)
      .get();

    return c.html(
      await view(GravePage, { siteViews: await totalPageViews(),
        card: toCard(grave),
        nearby: nearby.map(toCard),
        sponsors: await liveSponsors(),
        siteUrl: config<string>("app.url", "http://localhost:3000"),
        settling,
      }),
    );
  }
}
