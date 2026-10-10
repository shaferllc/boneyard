import Layout, { type SponsorCard } from "./layout.js";
import { GraveCard, MassGraveRow, MausoleumPlot, TombPlot } from "./graves.js";
import type { TierKey } from "../../app/Domain/graveyard.js";

const COPY: Record<Exclude<TierKey, "pyramid">, { title: string; blurb: string; noun: string }> = {
  mausoleum: {
    title: "THE MAUSOLEUMS",
    blurb: "The ones that died with a building to their name.",
    noun: "in here",
  },
  tomb: {
    title: "THE TOMBS",
    blurb: "Every startup that got a headstone of its own.",
    noun: "in here",
  },
  mass: {
    title: "THE MASS GRAVE",
    blurb: "Everyone who went in the pit. No stones, no ceremony.",
    noun: "down there",
  },
};

const TABS: { href: string; label: string; tier: TierKey }[] = [
  { href: "/graves/mass-grave", label: "MASS GRAVE", tier: "mass" },
  { href: "/graves/tombs", label: "TOMBS", tier: "tomb" },
  { href: "/graves/mausoleums", label: "MAUSOLEUMS", tier: "mausoleum" },
];

export default function List({
  tier,
  graves,
  sponsors,
  siteViews,
}: {
  tier: Exclude<TierKey, "pyramid">;
  graves: GraveCard[];
  sponsors: SponsorCard[];
  siteViews?: number | null;
}) {
  const copy = COPY[tier];
  // Mirrors routes/web.ts. Three entries, and a wrong one is a canonical tag
  // pointing at a 404 — worth being explicit rather than deriving it.
  const path = { mass: "/graves/mass-grave", tomb: "/graves/tombs", mausoleum: "/graves/mausoleums" }[tier];

  return (
    <Layout siteViews={siteViews} title={`${copy.title} — the boneyard`} description={copy.blurb} sponsors={sponsors} canonical={path}>
      <div class="wrap py-8">
        <a href="/" class="text-[12px] text-teal hover:underline">
          ← back to the graveyard
        </a>

        <h1 class="pixel mt-5 text-[18px]">{copy.title}</h1>
        <p class="mt-1 text-[13px] text-gray">{copy.blurb}</p>
        <p class="mt-1 text-[12px] text-gray">
          <span class="pixel text-ink">{graves.length}</span> {copy.noun}.
        </p>

        <nav class="mt-5 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <a
              href={tab.href}
              aria-current={tab.tier === tier ? "page" : undefined}
              class={`pixel rounded-full border-2 px-4 py-1.5 text-[12px] ${
                tab.tier === tier ? "border-ink bg-ink text-bg" : "border-gray-dark text-gray hover:border-ink hover:text-ink"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </nav>

        <div class="mt-8">
          {graves.length === 0 ? (
            <p class="text-[13px] text-gray">
              Nobody yet.{" "}
              <a href="/bury" class="text-teal hover:underline">
                Be the first
              </a>
              .
            </p>
          ) : tier === "mass" ? (
            <ul class="pxbox grid gap-x-8 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {graves.map((card) => (
                <MassGraveRow card={card} />
              ))}
            </ul>
          ) : tier === "mausoleum" ? (
            <div class="grid grid-cols-2 items-end gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {graves.map((card) => (
                <MausoleumPlot card={card} />
              ))}
            </div>
          ) : (
            <div class="grid grid-cols-3 items-end gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {graves.map((card) => (
                <TombPlot card={card} />
              ))}
            </div>
          )}
        </div>

        <p class="mt-10 text-[13px] text-gray">
          That is everyone.{" "}
          <a href="/bury" class="text-teal hover:underline">
            Bury yours too
          </a>
          .
        </p>
      </div>
    </Layout>
  );
}
