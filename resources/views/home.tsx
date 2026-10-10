import Layout, { type SponsorCard } from "./layout.js";
import { GraveCard, MassGraveRow, MausoleumPlot, PyramidPlot, TombPlot } from "./graves.js";
import { Ghost, Shrub, Skull } from "./art.js";
import { PYRAMID_SLOTS } from "../../app/Domain/graveyard.js";

/** How many empty plots to leave standing when a tier is not yet sold out. */
const MAUSOLEUM_PLOTS = 5;
const TOMB_PLOTS = 12;

export default function Home({
  sponsors,
  pyramids,
  mausoleums,
  tombs,
  massGrave,
  massTotal,
  siteViews,
}: {
  sponsors: SponsorCard[];
  /** Indexed by slot, 1-based, so a paid slot 3 stays slot 3 with 1 and 2 empty. */
  pyramids: (GraveCard | undefined)[];
  mausoleums: GraveCard[];
  tombs: GraveCard[];
  massGrave: GraveCard[];
  massTotal: number;
  siteViews?: number | null;
}) {
  const mausoleumPlots = Math.max(MAUSOLEUM_PLOTS, mausoleums.length);
  const tombPlots = Math.max(TOMB_PLOTS, tombs.length);

  return (
    <Layout
      siteViews={siteViews}
      title="THE BONEYARD — where failed startups rest in peace"
      description="A digital cemetery for dead startups. Bury your failed app, walk among other people's failures, and pay for a nicer grave."
      sponsors={sponsors}
      canonical="/"
    >
      <div class="flex flex-col items-center gap-1 px-4 pt-4 pb-1 text-center">
        <h1 class="pixel text-[15px] tracking-wide sm:text-[20px]">THE BONEYARD</h1>
        <span class="text-[10px] text-gray sm:text-[13px]">where failed startups rest in peace</span>
      </div>

      {/* ------------------------------------------------------- pyramids */}
      <section class="wrap pt-2 pb-10">
        <div class="mx-auto grid max-w-4xl grid-cols-3 items-end gap-4 sm:gap-8">
          {Array.from({ length: PYRAMID_SLOTS }).map((_, i) => (
            <PyramidPlot card={pyramids[i]} slot={i + 1} />
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- mausoleums */}
      <section class="wrap pb-10">
        <div class="mb-3 flex items-end justify-between gap-3">
          <h2 class="pixel text-[13px] text-gray">THE MAUSOLEUMS</h2>
          <a href="/graves/mausoleums" class="text-[12px] text-teal hover:underline">
            see every mausoleum →
          </a>
        </div>
        <div class="grid grid-cols-2 items-end gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: mausoleumPlots }).map((_, i) => (
            <MausoleumPlot card={mausoleums[i]} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- tombs */}
      <section class="wrap pb-10">
        <div class="mb-3 flex items-end justify-between gap-3">
          <h2 class="pixel text-[13px] text-gray">THE TOMBS</h2>
          <a href="/graves/tombs" class="text-[12px] text-teal hover:underline">
            see every tomb →
          </a>
        </div>
        <div class="grid grid-cols-3 items-end gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: tombPlots }).map((_, i) => (
            <TombPlot card={tombs[i]} />
          ))}
        </div>
        <div class="mt-2 flex items-end justify-between px-2">
          <Shrub class="w-10" />
          <Ghost class="w-8 floaty" />
          <Skull class="w-7" />
        </div>
      </section>

      {/* ----------------------------------------------------- mass grave */}
      <section class="wrap pb-14">
        <div class="pxbox p-5 sm:p-7">
          <div class="mb-3 flex items-end justify-between gap-3">
            <h2 class="pixel text-[13px] text-gray">THE MASS GRAVE</h2>
            <a href="/graves/mass-grave" class="text-[12px] text-teal hover:underline">
              see everyone down there →
            </a>
          </div>

          <ul class="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {massGrave.map((card) => (
              <MassGraveRow card={card} />
            ))}
          </ul>

          <p class="mt-4 text-[12px] text-gray">
            <span class="pixel text-ink">{massTotal}</span> souls down there.{" "}
            <a href="/bury" class="text-teal hover:underline">
              Bury yours too
            </a>
            {" · "}
            <a href="/bury?tier=tomb" class="text-teal hover:underline">
              or give it a headstone
            </a>
          </p>
        </div>
      </section>
    </Layout>
  );
}
