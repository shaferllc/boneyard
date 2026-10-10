import { config } from "@shaferllc/keel/core";
import type { PropsWithChildren } from "hono/jsx";

import { SPONSOR_PRICE, formatViews } from "../../app/Domain/graveyard.js";
import { totalPageViews } from "../../app/Domain/stats.js";
import { Sky, Bones } from "./art.js";

export interface SponsorCard {
  name: string;
  url: string;
  logo_url: string | null;
  tagline: string | null;
}

/**
 * Restore the saved theme before the first paint.
 *
 * This has to be inline and synchronous in <head>. Deferred, the page renders
 * light and then snaps to dark — and a cemetery that flashes white at you is a
 * worse joke than the one intended.
 */
const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

const THEME_TOGGLE = `(function(){var d=document.documentElement;var next=d.dataset.theme==="dark"?"light":"dark";d.dataset.theme=next;try{localStorage.setItem("theme",next)}catch(e){}})()`;

function SponsorLogo({ sponsor }: { sponsor: SponsorCard }) {
  return (
    <a
      href={sponsor.url}
      target="_blank"
      rel="noopener sponsored"
      class="flex shrink-0 items-center gap-2.5 hover:opacity-70"
    >
      {sponsor.logo_url && (
        <img onerror="this.style.display='none'"
          src={sponsor.logo_url}
          alt=""
          class="h-8 w-8 rounded-lg border-2 border-ink bg-white object-contain"
          loading="lazy"
        />
      )}
      <span class="pixel text-[14px]">{sponsor.name}</span>
    </a>
  );
}

function EmptyPlot({ compact }: { compact?: boolean }) {
  return (
    <a
      href="/sponsor"
      class={
        compact
          ? "pixel flex shrink-0 items-center gap-2 rounded-full border-2 border-dashed border-teal px-4 py-1.5 text-[13px] text-teal hover:bg-teal hover:text-white"
          : "pixel block rounded-2xl border-2 border-dashed border-teal p-3 text-center text-[12px] text-teal hover:bg-teal hover:text-white"
      }
    >
      {compact ? (
        <>+ YOUR LOGO HERE — ${SPONSOR_PRICE}</>
      ) : (
        <>
          Advertise here
          <br />${SPONSOR_PRICE}/mo
        </>
      )}
    </a>
  );
}

/**
 * The mobile ad rail. The track is rendered twice because a `translateX(-50%)`
 * marquee needs two identical halves to loop without a visible seam.
 */
function SponsorMarquee({ sponsors }: { sponsors: SponsorCard[] }) {
  const half = (
    <>
      {sponsors.map((s) => (
        <SponsorLogo sponsor={s} />
      ))}
      <EmptyPlot compact />
    </>
  );

  return (
    <div class="w-full overflow-hidden border-b-[3px] border-ink bg-card py-2.5 xl:hidden">
      <div class="marquee-track gap-10 px-5">
        {half}
        {half}
      </div>
    </div>
  );
}

/** The desktop rails: one column pinned either side, padded out with empty plots. */
function SponsorRail({ sponsors, side }: { sponsors: SponsorCard[]; side: "left" | "right" }) {
  const slots = 5;
  const filled = sponsors.slice(0, slots);

  return (
    <aside
      class={`fixed top-24 z-20 hidden w-40 xl:block ${side === "left" ? "left-4" : "right-4"}`}
      aria-label="Sponsors"
    >
      <div class="space-y-3">
        {filled.map((s) => (
          <a
            href={s.url}
            target="_blank"
            rel="noopener sponsored"
            class="pxbox-white block p-3 text-center transition-transform hover:-translate-y-0.5"
          >
            {s.logo_url && <img onerror="this.style.display='none'" src={s.logo_url} alt="" class="mx-auto h-11 w-11 rounded-lg object-contain" loading="lazy" />}
            <p class="pixel mt-1.5 text-[12px]">{s.name}</p>
            {s.tagline && <p class="mt-1 line-clamp-2 text-[10px] leading-snug text-gray">{s.tagline}</p>}
          </a>
        ))}
        {Array.from({ length: Math.max(0, slots - filled.length) }).map(() => (
          <EmptyPlot />
        ))}
      </div>
    </aside>
  );
}

export function SiteFooter({ views }: { views: number | null }) {
  return (
    <footer class="mt-16 border-t-[3px] border-ink bg-card py-8">
      <div class="wrap flex flex-col items-center gap-3 text-center">
        <Bones class="w-10" />
        <p class="pixel text-[15px]">THE BONEYARD</p>
        <p class="text-[12px] text-gray">· bury your startup, keep your dignity ·</p>

        {/* Our lot on plugbid. The badge redraws with the rank, so it never goes stale. */}
        <a href="https://plugbid.online/l/the-boneyard" target="_blank" rel="noopener">
          <img
            src="https://plugbid.online/l/the-boneyard/badge.svg"
            alt="The Boneyard on plugbid"
            width="150"
            height="28"
            loading="lazy"
            onerror="this.style.display='none'"
          />
        </a>
        {views !== null && (
          <p class="pixel text-[11px] text-gray">{formatViews(views)} visits to the graveyard</p>
        )}
        <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-gray">
          <a href="/graves/mass-grave" class="hover:text-ink">
            Mass grave
          </a>
          <a href="/graves/tombs" class="hover:text-ink">
            Tombs
          </a>
          <a href="/graves/mausoleums" class="hover:text-ink">
            Mausoleums
          </a>
          <a href="/bury" class="hover:text-ink">
            Bury yours
          </a>
          <a href="/sponsor" class="hover:text-ink">
            Sponsor the cemetery
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Layout({
  title,
  description,
  sponsors = [],
  chrome = true,
  noindex = false,
  canonical,
  siteViews = null,
  ogImage,
  children,
}: PropsWithChildren<{
  title: string;
  description?: string;
  sponsors?: SponsorCard[];
  /** Sponsor rails off — the bury and sponsor forms are not the place to sell ads. */
  chrome?: boolean;
  noindex?: boolean;
  /**
   * Absolute-path of this page, e.g. `/grave/quibbly`. Passed rather than read
   * from the request because Keel exposes `currentRequestId` but not the request
   * itself, and a canonical tag that guesses is worse than none.
   */
  canonical?: string;
  /**
   * Site-wide page views for the footer. Passed in rather than read here: this
   * component is rendered inside the JSX tree, and `hono/jsx` does not await
   * async child components — making this one async renders nothing and 500s the
   * page. The controller is the layer that is allowed to await.
   */
  siteViews?: number | null;
  /** Absolute path to this page's share card; defaults to the site-wide one. */
  ogImage?: string;
}>) {
  const site = config<string>("app.url", "").replace(/\/$/, "");
  const href = canonical ? `${site}${canonical}` : null;
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {noindex && <meta name="robots" content="noindex" />}
        {description && <meta name="description" content={description} />}
        {href && <link rel="canonical" href={href} />}
        <meta property="og:title" content={title} />
        {description && <meta property="og:description" content={description} />}
        {href && <meta property="og:url" content={href} />}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="The Boneyard" />
        {/* The whole distribution model is someone posting their grave. A link
            with no image is a link nobody clicks. */}
        <meta property="og:image" content={`${site}${ogImage ?? "/og.png"}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${site}${ogImage ?? "/og.png"}`} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link rel="stylesheet" href="/assets/app.css" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <Sky />

        {chrome && sponsors.length >= 0 && <SponsorMarquee sponsors={sponsors} />}
        {chrome && (
          <>
            <SponsorRail sponsors={sponsors.slice(0, 5)} side="left" />
            <SponsorRail sponsors={sponsors.slice(5, 10)} side="right" />
          </>
        )}

        <div class="relative z-10 flex min-h-screen flex-col">
          <main class="flex-1">{children}</main>
          <SiteFooter views={siteViews} />
        </div>

        <button
          type="button"
          class="pxbox-white fixed bottom-4 right-4 z-30 h-11 w-11 text-[18px] leading-none"
          aria-label="Toggle dark mode"
          onclick={THEME_TOGGLE}
        >
          <span aria-hidden="true">☀</span>
        </button>
      </body>
    </html>
  );
}
