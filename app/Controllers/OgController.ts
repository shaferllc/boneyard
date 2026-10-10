import type { Ctx } from "@shaferllc/keel/core";
import { config } from "@shaferllc/keel/core";
import { ImageResponse, loadGoogleFont } from "workers-og";

import { Grave } from "../Models/Grave.js";
import { formatDeath } from "../Domain/graveyard.js";

/**
 * The share card for one grave.
 *
 * The whole distribution model is a founder posting their own grave, so the
 * preview image is the product as far as growth is concerned: a generic card is
 * a link nobody clicks, and a headstone with *their* startup's name on it is one
 * they send to their group chat.
 *
 * Rendered on demand rather than at burial time — a grave is immutable once
 * bought, so the first render is the only expensive one and the edge cache serves
 * every share after it.
 */

/** satori parses this as markup, so anything from the database has to be inert. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Long epitaphs blow out the layout; the card is a headline, not the page. */
function clamp(value: string, max: number): string {
  const text = value.trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export class OgController {
  async grave(c: Ctx) {
    const site = config<string>("app.url", "").replace(/\/$/, "");

    try {
      const grave = await Grave.newQuery().where("slug", c.req.param("slug") ?? "").first();
      // No grave, or one nobody has paid for yet: fall back to the site card
      // rather than rendering a headstone for something that is not public.
      if (!grave || !grave.paid_at) return c.redirect(`${site}/og.png`, 302);

      const name = escapeHtml(clamp(grave.name, 34));
      const epitaph = grave.epitaph ? escapeHtml(clamp(grave.epitaph, 96)) : "";
      const meta = [formatDeath(grave.died), grave.cause].filter(Boolean).map(String).map(escapeHtml).join("  ·  ");

      // satori is a flexbox subset and its box model is not the browser's:
      // `width` is content-box, percentages resolve oddly against padded parents,
      // and a `space-between` row shrink-wraps and drifts instead of spanning.
      // Anything whose position actually matters is pinned with absolute
      // coordinates, which it honours exactly.
      const markup = `
        <div style="display:flex;position:relative;width:1200px;height:630px;background:#f6f3ec;font-family:Lora;">
          <div style="display:flex;position:absolute;right:96px;top:104px;width:210px;height:300px;background:#e3ddd2;border-radius:105px 105px 10px 10px;"></div>
          <div style="display:flex;position:absolute;right:60px;bottom:212px;width:282px;height:14px;background:#3a3340;border-radius:7px;"></div>
          <div style="display:flex;position:absolute;left:70px;bottom:64px;font-size:24px;color:#837b8c;">R.I.P.</div>
          <div style="display:flex;position:absolute;right:70px;bottom:64px;font-size:24px;color:#837b8c;">boneyard.online</div>
          <div style="display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;padding:70px;">
            <div style="display:flex;flex-direction:column;width:790px;">
              <div style="display:flex;font-size:24px;color:#837b8c;letter-spacing:6px;">THE BONEYARD</div>
              <div style="display:flex;font-size:82px;color:#3a3340;margin-top:24px;line-height:1.05;">${name}</div>
              <div style="display:flex;font-size:29px;color:#837b8c;margin-top:18px;">${meta}</div>
            </div>
            ${epitaph ? `<div style="display:flex;width:790px;font-size:36px;color:#3a3340;line-height:1.35;">“${epitaph}”</div>` : ""}
            <div style="display:flex;"></div>
          </div>
        </div>`;

      return new ImageResponse(markup, {
        width: 1200,
        height: 630,
        format: "png",
        fonts: [
          {
            name: "Lora",
            data: await loadGoogleFont({ family: "Lora", weight: 700 }),
            weight: 700,
            style: "normal",
          },
        ],
        headers: {
          // A grave never changes after it is bought, so this is safe to cache
          // hard — which is the point: the render only happens once per grave.
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      // A broken share image must never be a broken share. Fall back to the
      // static card and keep the failure in the logs rather than in someone's
      // timeline.
      console.error(`og render failed for ${c.req.param("slug")}: ${String(error)}`);
      return c.redirect(`${site}/og.png`, 302);
    }
  }
}
