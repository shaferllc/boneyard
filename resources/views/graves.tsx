/**
 * A grave, at each of the four sizes you can buy.
 *
 * Each component takes either a grave or nothing. Nothing renders the empty plot
 * with its price on it — which is the point of the whole layout: the vacancies are
 * the storefront, so an empty graveyard should look like an empty graveyard rather
 * than like a broken page.
 */

import { formatDeath, TIER, type Emblem, type Shape, type TierKey } from "../../app/Domain/graveyard.js";
import type { DecayState } from "../../app/Domain/decay.js";
import { MausoleumShell, PyramidShell, Stone, STONE_ASPECT, STONE_TEXT_TOP } from "./art.js";

export interface GraveCard {
  slug: string;
  name: string;
  tier: TierKey;
  slot: number | null;
  url: string | null;
  logo_url: string | null;
  died: string | null;
  cause: string | null;
  handle: string | null;
  shape: Shape;
  emblem: Emblem;
  epitaph: string | null;
  description: string | null;
  domain_state: DecayState;
  domain_expires_at: string | null;
  views: number;
}

function Logo({ card, size }: { card: GraveCard; size: string }) {
  if (!card.logo_url) return <></>;
  return (
    <img onerror="this.style.display='none'"
      src={card.logo_url}
      alt=""
      loading="lazy"
      class={`${size} rounded-lg border-2 border-ink bg-white object-contain`}
    />
  );
}

/* ----------------------------------------------------------------- pyramid */

export function PyramidPlot({ card, slot }: { card?: GraveCard; slot: number }) {
  if (!card) {
    return (
      <a class="tomb block text-center" href={`/bury?tier=pyramid&slot=${slot}`}>
        <div class="relative aspect-[130/90] w-full opacity-70">
          <PyramidShell />
        </div>
        <p class="pixel mt-1 text-[11px] leading-tight text-gray sm:text-[13px]">
          Claim · <span class="text-yellow">${TIER.pyramid.price}</span>
        </p>
      </a>
    );
  }

  return (
    <a class="tomb block text-center" href={`/grave/${card.slug}`}>
      <div class="relative aspect-[130/90] w-full">
        <PyramidShell />
        <div class="absolute inset-x-0 top-[42%] flex flex-col items-center gap-1 px-4">
          <Logo card={card} size="h-8 w-8 sm:h-10 sm:w-10" />
        </div>
      </div>
      <p class="pixel mt-1 truncate text-[12px] leading-tight sm:text-[14px]">{card.name}</p>
      <p class="text-[10px] text-gray sm:text-[12px]">{formatDeath(card.died)}</p>
    </a>
  );
}

/* --------------------------------------------------------------- mausoleum */

export function MausoleumPlot({ card }: { card?: GraveCard }) {
  if (!card) {
    return (
      <a class="tomb block text-center" href="/bury?tier=mausoleum">
        <div class="relative aspect-[170/130] w-full opacity-70">
          <MausoleumShell />
        </div>
        <p class="pixel mt-1 text-[11px] leading-tight text-gray sm:text-[13px]">
          Claim · <span class="text-yellow">${TIER.mausoleum.price}</span>
        </p>
      </a>
    );
  }

  return (
    <a class="tomb block text-center" href={`/grave/${card.slug}`}>
      <div class="relative aspect-[170/130] w-full">
        <MausoleumShell />
        <div class="absolute inset-x-0 top-[30%] flex flex-col items-center gap-1 px-6">
          <Logo card={card} size="h-8 w-8" />
        </div>
      </div>
      <p class="pixel mt-1 truncate text-[13px] leading-tight">{card.name}</p>
      <p class="text-[11px] text-gray">{formatDeath(card.died)}</p>
      {card.epitaph && <p class="mx-auto mt-1 max-w-[22ch] text-[11px] leading-snug text-gray">“{card.epitaph}”</p>}
    </a>
  );
}

/* -------------------------------------------------------------------- tomb */

export function TombPlot({ card }: { card?: GraveCard }) {
  const shape: Shape = card?.shape ?? "classic";

  if (!card) {
    return (
      <a class="tomb block text-center" href="/bury?tier=tomb">
        <div class="relative w-full opacity-70" style={`aspect-ratio:${STONE_ASPECT.classic}`}>
          <Stone shape="classic" emblem="plain" />
        </div>
        <p class="pixel mt-1 text-[11px] leading-tight text-gray">
          Claim · <span class="text-yellow">${TIER.tomb.price}</span>
        </p>
      </a>
    );
  }

  return (
    <a class="tomb block text-center" href={`/grave/${card.slug}`}>
      <div class="relative w-full" style={`aspect-ratio:${STONE_ASPECT[shape]}`}>
        <Stone shape={shape} emblem={card.emblem} />
        <div class="absolute inset-x-0 flex flex-col items-center gap-1 px-[22%]" style={`top:${STONE_TEXT_TOP[shape]}`}>
          <Logo card={card} size="h-7 w-7" />
          <p class="pixel w-full truncate text-[10px] leading-tight text-carve">{card.name}</p>
          <p class="text-[9px] leading-none text-carve-soft">{formatDeath(card.died)}</p>
        </div>
      </div>
    </a>
  );
}

/* -------------------------------------------------------------- mass grave */

/** One line in the pit. No stone, no page, no link — that is what free buys. */
export function MassGraveRow({ card }: { card: GraveCard }) {
  return (
    <li class="flex items-center gap-2 py-1 text-[12px] text-gray">
      {card.logo_url ? (
        <img onerror="this.style.display='none'" src={card.logo_url} alt="" loading="lazy" class="h-4 w-4 shrink-0 rounded object-contain opacity-70" />
      ) : (
        <span class="h-4 w-4 shrink-0 rounded border border-gray/40" aria-hidden="true" />
      )}
      <span class="truncate">
        <span class="text-ink">{card.name}</span>
        {" · "}
        {card.died ? `died ${formatDeath(card.died)}` : "date of death unknown"}
      </span>
    </li>
  );
}
