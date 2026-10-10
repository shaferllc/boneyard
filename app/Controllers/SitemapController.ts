import type { Ctx } from "@shaferllc/keel/core";
import { config } from "@shaferllc/keel/core";

import { published } from "../Domain/cemetery.js";

/**
 * The sitemap.
 *
 * The graveyard's long tail is the grave pages — one indexable page per dead
 * startup, which is the only content here that grows on its own. Nothing links to
 * an old grave once it has scrolled off the listings, so without this they are
 * reachable but effectively undiscoverable.
 *
 * Reads through `published()` like every other query, so an unpaid grave cannot
 * leak into the sitemap and get itself indexed before it is bought.
 */
export class SitemapController {
  async index(c: Ctx) {
    const site = config<string>("app.url", "").replace(/\/$/, "");
    const graves = (await published().orderBy("id", "desc").get()) as Array<{
      slug: string;
      updated_at?: string | null;
      created_at?: string | null;
    }>;

    const urls: Array<{ loc: string; lastmod?: string | null }> = [
      { loc: `${site}/` },
      { loc: `${site}/graves/mass-grave` },
      { loc: `${site}/graves/tombs` },
      { loc: `${site}/graves/mausoleums` },
      { loc: `${site}/bury` },
      { loc: `${site}/sponsor` },
      ...graves.map((g) => ({
        loc: `${site}/grave/${encodeURIComponent(g.slug)}`,
        lastmod: (g.updated_at ?? g.created_at ?? null)?.slice(0, 10),
      })),
    ];

    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(
        (u) => `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
      ),
      "</urlset>",
    ].join("\n");

    return c.body(body, 200, {
      "content-type": "application/xml; charset=utf-8",
      // A grave is immutable once bought, so the only thing that changes here is
      // which graves exist. An hour is plenty.
      "cache-control": "public, max-age=3600",
    });
  }
}

/** Slugs are `[a-z0-9-]`, but `loc` is XML and the site URL is config. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
