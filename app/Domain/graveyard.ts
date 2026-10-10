/**
 * What can be bought, what it costs, and what the stone may say.
 *
 * Everything the graveyard sells is described here rather than spread across the
 * form, the controller and the views — the tier list *is* the product, and a price
 * that disagrees with itself across three files is the one bug that costs money.
 */

export type TierKey = "mass" | "tomb" | "mausoleum" | "pyramid";

export interface Tier {
  key: TierKey;
  label: string;
  /** In whole dollars. Zero means free. */
  price: number;
  blurb: string;
}

/** Ordered cheapest first — the form renders them in this order. */
export const TIERS: Tier[] = [
  {
    key: "mass",
    label: "Mass grave",
    price: 0,
    blurb: "A line of text at the bottom. No headstone, no epitaph, no link.",
  },
  {
    key: "tomb",
    label: "Tomb",
    price: 2,
    blurb: "A real headstone in the graveyard. Epitaph, logo, a page of its own.",
  },
  {
    key: "mausoleum",
    label: "Mausoleum",
    price: 50,
    blurb: "A whole building above the tombs. Long epitaph, description, link out.",
  },
  {
    key: "pyramid",
    label: "Pyramid",
    price: 200,
    blurb: "One of only three pyramids at the very top. Maximum glory.",
  },
];

export const TIER = Object.fromEntries(TIERS.map((t) => [t.key, t])) as Record<TierKey, Tier>;

/** Scarcity is the whole pitch. Three, forever. */
export const PYRAMID_SLOTS = 3;

/** Sponsor plots sold at once, and what thirty days costs. */
export const SPONSOR_PLOTS = 20;
export const SPONSOR_PRICE = 49;
export const SPONSOR_DAYS = 30;

export const CAUSES = [
  "No users",
  "Ran out of money",
  "Competition killed it",
  "Lost motivation",
  "Pivoted",
  "Nobody cared",
  "Tech debt",
  "Co-founder breakup",
  "AI replaced it",
  "Other",
] as const;

/** The silhouette of the headstone. */
export const SHAPES = ["classic", "cross", "gothic"] as const;
export type Shape = (typeof SHAPES)[number];

/** The little carving near the base. */
export const EMBLEMS = ["plain", "cross", "crescent", "flower", "candles", "dove", "tree"] as const;
export type Emblem = (typeof EMBLEMS)[number];

export function isTier(value: unknown): value is TierKey {
  return typeof value === "string" && value in TIER;
}

export function isShape(value: unknown): value is Shape {
  return SHAPES.includes(value as Shape);
}

export function isEmblem(value: unknown): value is Emblem {
  return EMBLEMS.includes(value as Emblem);
}

/**
 * A URL-safe stub of the name. Dots survive as dashes, so `robid.lol` reads as
 * `robid-lol` rather than `robidlol` — half of these startups *are* their domain.
 */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "unnamed"
  );
}

/** `taken` is asked, not scanned, so the caller decides how it hits the database. */
export function uniqueSlug(name: string, taken: (slug: string) => boolean): string {
  const base = slugify(name);
  if (!taken(base)) return base;

  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!taken(candidate)) return candidate;
  }

  throw new Error(`no free slug for "${name}"`);
}

/**
 * `YYYY-MM`, or null. A date of death nobody remembers is the honest answer, and
 * the graveyard prints "?" for it rather than inventing one.
 */
export function deathDate(month: unknown, year: unknown): string | null {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(y) || y < 1990 || y > new Date().getFullYear() + 1) return null;
  return `${y}-${String(m).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2024-08" → "Aug 2024". */
export function formatDeath(died: string | null): string {
  if (!died) return "?";
  const [year, month] = died.split("-");
  const index = Number(month) - 1;
  return MONTHS[index] ? `${MONTHS[index]} ${year}` : died;
}

/**
 * Normalise whatever was pasted into the URL box. A bare `example.com` is what
 * people actually type, so assume https rather than rejecting it.
 */
export function normalizeUrl(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Google's favicon service, which is how a grave gets a logo without anyone being
 * asked to upload one.
 *
 * ponytail: third-party and unversioned. If it disappears or starts rate-limiting,
 * fetch the favicon once at burial and keep the bytes in R2.
 */
export function logoFor(url: string | null): string | null {
  if (!url) return null;
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`;
  } catch {
    return null;
  }
}

/** `@handle` → `handle`, and nothing that is not a handle. */
export function normalizeHandle(raw: unknown): string | null {
  const value = String(raw ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .replace(/^@/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(value) ? value : null;
}

/** Trim to a hard ceiling. Epitaphs are carved, not blogged. */
export function clamp(raw: unknown, max: number): string | null {
  const value = String(raw ?? "")
    .trim()
    .slice(0, max);
  return value || null;
}

/**
 * Is this request a machine?
 *
 * A view count is a vanity number, and vanity numbers are only fun if they are
 * roughly true. Without this, the count on a fresh grave is mostly Googlebot,
 * Slack unfurling the link, and whatever monitors the site — which is both wrong
 * and boring.
 *
 * Deliberately crude: it errs toward *not* counting. Missing a real visitor costs
 * nothing; counting a crawler as a mourner is the failure that makes the number
 * meaningless.
 */
const BOTS = /bot|crawl|spider|slurp|search|preview|fetch|monitor|scrape|curl|wget|python|headless|lighthouse|pingdom|uptime|facebookexternalhit|embedly|whatsapp|telegram|discord|slack/i;

export function looksAutomated(userAgent: string | null | undefined): boolean {
  const value = (userAgent ?? "").trim();
  // No UA at all is a script, not a browser.
  if (!value) return true;
  return BOTS.test(value);
}

/** `1204` → `1,204`. */
export function formatViews(views: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, views));
}
