/**
 * A graveyard with nobody in it is just a field.
 *
 * These are invented startups — the joke does not need real people's failures in
 * it, and inventing them means the demo can be re-run without libelling anyone.
 * Idempotent: it clears the tables it owns first, so running it twice does not
 * bury everyone twice.
 */

import { db } from "@shaferllc/keel/core";

import { Grave } from "../app/Models/Grave.js";
import { Sponsor } from "../app/Models/Sponsor.js";
import { logoFor, SPONSOR_DAYS, slugify } from "../app/Domain/graveyard.js";

interface Plot {
  name: string;
  tier: "mass" | "tomb" | "mausoleum" | "pyramid";
  slot?: number;
  /**
   * Left unset throughout: these startups are invented, and Google's favicon
   * service answers an unknown domain with a generic globe at HTTP 200 — which
   * `onerror` cannot catch, so every seeded grave would wear the same placeholder.
   */
  url?: string;
  died?: string;
  cause?: string;
  handle?: string;
  shape?: "classic" | "cross" | "gothic";
  emblem?: "plain" | "cross" | "crescent" | "flower" | "candles" | "dove" | "tree";
  epitaph?: string;
  description?: string;
}

const PLOTS: Plot[] = [
  {
    name: "Synergize",
    tier: "pyramid",
    slot: 1,
    died: "2024-03",
    cause: "Ran out of money",
    handle: "founder",
    epitaph: "Raised $40M. Shipped a landing page.",
    description:
      "An AI-native platform for aligning cross-functional stakeholder outcomes. Eighteen months, four pivots, one very good deck, and not a single paying customer who could explain what it did.",
  },
  {
    name: "Blockchainly",
    tier: "pyramid",
    slot: 3,
    died: "2023-06",
    cause: "Nobody cared",
    epitaph: "Decentralised everything. Including the users.",
    description:
      "Put loyalty punch cards on-chain. Gas fees exceeded the value of a free coffee by roughly a factor of nine.",
  },

  // The only plots here with a `url`, and every one of them points at a domain
  // that is genuinely unregistered. That is deliberate: it is what the domain
  // watch is for. RDAP reports them available, the nightly sweep marks them
  // `lapsed`, and the headstones visibly rot. See app/Domain/decay.ts.
  {
    name: "Quibbly",
    tier: "mausoleum",
    url: "quibbly.online",
    died: "2025-08",
    cause: "Co-founder breakup",
    handle: "quibbly",
    epitaph: "Settled arguments. Started one.",
    description:
      "A structured-debate tool for teams that could not agree. The founders stopped speaking during a disagreement about the roadmap, which the product proved unable to resolve.",
  },
  {
    name: "Cratewise",
    tier: "mausoleum",
    url: "cratewise.cloud",
    died: "2025-04",
    cause: "Ran out of money",
    epitaph: "Optimised the warehouse. Not the runway.",
    description:
      "Inventory forecasting for small importers. It correctly predicted a shortage of very nearly everything, cash included, and shipped the alert eleven days after the wire failed.",
  },
  {
    name: "Tangleboard",
    tier: "tomb",
    url: "tangleboard.online",
    died: "2024-11",
    cause: "Competition killed it",
    epitaph: "Infinite canvas. Finite users.",
  },
  {
    name: "Skiffly",
    tier: "tomb",
    url: "skiffly.online",
    died: "2026-01",
    cause: "Nobody cared",
    handle: "skiffly",
    epitaph: "Micro-invoicing, for people who did not invoice.",
  },
  {
    name: "Grumbld",
    tier: "tomb",
    url: "grumbld.online",
    died: "2025-09",
    cause: "AI replaced it",
    epitaph: "Somewhere to complain. Outlived by a chatbot that listens.",
  },

  {
    name: "Ferndesk",
    tier: "mausoleum",
    died: "2025-01",
    cause: "Competition killed it",
    handle: "ferndesk",
    epitaph: "A helpdesk nobody needed help with.",
    description: "Support inbox for teams of two. Both of them left.",
  },
  {
    name: "Loopr",
    tier: "mausoleum",
    died: "2025-03",
    cause: "Lost motivation",
    epitaph: "Went round and round.",
    description: "Habit tracking for people who could not form the habit of opening it.",
  },
  {
    name: "Stackmint",
    tier: "mausoleum",
    died: "2023-11",
    cause: "Co-founder breakup",
    epitaph: "Two founders. One repo. No speaking terms.",
  },

  { name: "Nomadly", tier: "tomb", died: "2024-02", cause: "No users", shape: "gothic", emblem: "tree", epitaph: "Booked one trip. Mine." },
  { name: "Pushup RPG", tier: "tomb", cause: "Lost motivation", shape: "classic", emblem: "candles", epitaph: "Level 1 forever." },
  { name: "Vively", tier: "tomb", died: "2024-08", cause: "Pivoted", shape: "cross", emblem: "flower", epitaph: "Pivoted into the ground." },
  { name: "Quillbot Jr", tier: "tomb", died: "2025-05", cause: "AI replaced it", shape: "classic", emblem: "dove", epitaph: "Replaced by the thing it wrapped." },
  { name: "Tabsy", tier: "tomb", died: "2022-09", cause: "Tech debt", shape: "gothic", emblem: "plain", epitaph: "1,400 open tabs. One of them was the fix." },
  { name: "Meetcute", tier: "tomb", died: "2023-02", cause: "Nobody cared", shape: "classic", emblem: "crescent", epitaph: "No meets. No cute." },
  { name: "Grillr", tier: "tomb", died: "2024-11", cause: "Other", shape: "cross", emblem: "cross", epitaph: "Uber for barbecues. Health code disagreed." },

  { name: "Million Token Homepage", tier: "mass", cause: "Nobody cared" },
  { name: "Dropfeed", tier: "mass", died: "2024-04" },
  { name: "Zeptobase", tier: "mass", died: "2023-07", cause: "Ran out of money" },
  { name: "Chirpline", tier: "mass", died: "2022-12", cause: "Competition killed it" },
  { name: "Slidewise", tier: "mass", died: "2025-02", cause: "AI replaced it" },
  { name: "Parrotly", tier: "mass", cause: "Lost motivation" },
  { name: "Bunchr", tier: "mass", died: "2021-08", cause: "No users" },
  { name: "Formhaus", tier: "mass", died: "2024-06", cause: "Tech debt" },
  { name: "Snacc", tier: "mass", died: "2023-03", cause: "Co-founder breakup" },
  { name: "Wanderbox", tier: "mass", died: "2020-05", cause: "Other" },
  { name: "Tinylytics Pro", tier: "mass", died: "2025-06", cause: "Nobody cared" },
  { name: "Roomiez", tier: "mass", died: "2022-02", cause: "No users" },
];

/** Same reasoning as the graves: no logo beats a globe. */
const SPONSORS = [
  { name: "Gravepost", url: "https://gravepost.example", tagline: "Obituaries for software, written by people who cared." },
  { name: "Runway Radar", url: "https://runwayradar.example", tagline: "Know how many months you have left. Before you need to." },
];

export async function seed(log: (message: string) => void = () => {}): Promise<{ graves: number; sponsors: number }> {
  await db("graves").delete();
  await db("sponsors").delete();
  log("Cleared the old graveyard.");

  for (const plot of PLOTS) {
    const url = plot.url ? `https://${plot.url}` : null;

    await Grave.create({
      slug: slugify(plot.name),
      name: plot.name,
      tier: plot.tier,
      slot: plot.slot ?? null,
      url,
      logo_url: logoFor(url),
      died: plot.died ?? null,
      cause: plot.cause ?? null,
      handle: plot.handle ?? null,
      shape: plot.shape ?? "classic",
      emblem: plot.emblem ?? "plain",
      epitaph: plot.epitaph ?? null,
      description: plot.description ?? null,
      paid_at: new Date().toISOString(),
    });
  }
  log(`Buried ${PLOTS.length}.`);

  const expires = new Date(Date.now() + SPONSOR_DAYS * 86_400_000).toISOString();
  for (const s of SPONSORS) {
    await Sponsor.create({ ...s, logo_url: null, expires_at: expires, paid_at: new Date().toISOString() });
  }
  log(`${SPONSORS.length} sponsors live.`);

  return { graves: PLOTS.length, sponsors: SPONSORS.length };
}
