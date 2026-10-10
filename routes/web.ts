import type { Router, Ctx } from "@shaferllc/keel/core";

import { GraveyardController } from "../app/Controllers/GraveyardController.js";
import { BuryController } from "../app/Controllers/BuryController.js";
import { SponsorController } from "../app/Controllers/SponsorController.js";
import { StripeController } from "../app/Controllers/StripeController.js";
import { SitemapController } from "../app/Controllers/SitemapController.js";
import { OgController } from "../app/Controllers/OgController.js";

export default function routes(router: Router): void {
  router.get("/", [GraveyardController, "index"]).name("home");

  // The three listings are the same handler with the tier bound, so a URL can
  // never ask for a tier the page does not know how to draw.
  const graveyard = new GraveyardController();
  router.get("/graves/mass-grave", graveyard.list("mass")).name("mass-grave");
  router.get("/graves/tombs", graveyard.list("tomb")).name("tombs");
  router.get("/graves/mausoleums", graveyard.list("mausoleum")).name("mausoleums");

  router.get("/grave/:slug", [GraveyardController, "show"]).name("grave");

  router.get("/bury", [BuryController, "show"]).name("bury");
  router.post("/bury", [BuryController, "store"]);

  router.get("/sponsor", [SponsorController, "show"]).name("sponsor");
  router.post("/sponsor", [SponsorController, "store"]);

  // Stripe posts here. It is signature-verified rather than session-protected —
  // Stripe has no session, and the signature is the stronger check anyway.
  router.post("/stripe/webhook", [StripeController, "webhook"]);

  // Per-grave share card. Not under /assets: it is rendered, not a file.
  router.get("/og/grave/:slug", [OgController, "grave"]).name("og-grave");

  router.get("/sitemap.xml", [SitemapController, "index"]).name("sitemap");

  router.get("/health", (c: Ctx) => c.json({ ok: true }));
}
