import Layout, { type SponsorCard } from "./layout.js";
import { GraveCard, TombPlot } from "./graves.js";
import { MausoleumShell, PyramidShell, Stone, STONE_ASPECT } from "./art.js";
import { formatDeath, formatViews, TIER } from "../../app/Domain/graveyard.js";
import { decayLabel } from "../../app/Domain/decay.js";

function Monument({ card }: { card: GraveCard }) {
  if (card.tier === "pyramid") {
    return (
      <div class="relative aspect-[130/90] w-full max-w-md">
        <PyramidShell />
      </div>
    );
  }
  if (card.tier === "mausoleum") {
    return (
      <div class="relative aspect-[170/130] w-full max-w-md">
        <MausoleumShell />
      </div>
    );
  }
  return (
    <div
      class={`relative w-full max-w-[16rem] ${card.domain_state === "lapsed" ? "decayed" : ""}`}
      style={`aspect-ratio:${STONE_ASPECT[card.shape]}`}
    >
      <Stone shape={card.shape} emblem={card.emblem} />
    </div>
  );
}

export default function GravePage({
  card,
  nearby,
  sponsors,
  siteUrl,
  settling = false,
  siteViews,
}: {
  card: GraveCard;
  nearby: GraveCard[];
  sponsors: SponsorCard[];
  siteUrl: string;
  /** Paid for, but the webhook has not landed yet. */
  settling?: boolean;
  siteViews?: number | null;
}) {
  const permalink = `${siteUrl}/grave/${card.slug}`;
  const shareText = `${card.name} is dead. Buried in the boneyard.`;
  const shareHref = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(permalink)}`;

  return (
    <Layout
      siteViews={siteViews}
      title={`R.I.P. ${card.name} — the boneyard`}
      description={card.epitaph ?? `${card.name} died ${formatDeath(card.died)}. Buried in the boneyard.`}
      sponsors={sponsors}
      noindex={settling}
      canonical={`/grave/${card.slug}`}
      ogImage={`/og/grave/${card.slug}`}
    >
      {/* A grave is a real entity with a name, a date and a description, which is
          the difference between a rich result and a blue link. Omitted while the
          grave is still settling — it is noindexed then anyway. */}
      {!settling && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: `R.I.P. ${card.name}`,
              url: permalink,
              about: { "@type": "Thing", name: card.name },
              ...(card.died ? { datePublished: `${card.died}-01` } : {}),
              ...(card.epitaph ? { abstract: card.epitaph } : {}),
              ...(card.description ? { description: card.description } : {}),
            }),
          }}
        />
      )}
      <div class="wrap py-8">
        <a href="/" class="text-[12px] text-teal hover:underline">
          ← back to the graveyard
        </a>

        {settling && (
          <div class="pxbox mt-5 border-yellow p-4 text-[13px]">
            <p class="pixel text-[13px]">The ground is still settling.</p>
            <p class="mt-1 text-gray">
              Your payment is confirming with Stripe. This grave is not visible to anyone else yet —
              refresh in a few seconds and it will be.
            </p>
          </div>
        )}

        <div class="mt-6 flex flex-col items-center text-center">
          <p class="pixel text-[12px] tracking-[0.3em] text-gray">R.I.P.</p>

          <div class="mt-4 flex w-full justify-center">
            <Monument card={card} />
          </div>

          <div class="-mt-2 flex flex-col items-center gap-2">
            {card.logo_url && (
              <img onerror="this.style.display='none'"
                src={card.logo_url}
                alt=""
                class="h-12 w-12 rounded-xl border-2 border-ink bg-white object-contain"
              />
            )}
            <h1 class="pixel text-[22px]">{card.name}</h1>
            <p class="text-[13px] text-gray">{formatDeath(card.died)}</p>
          </div>

          {card.epitaph && (
            <p class="mt-5 max-w-lg text-[15px] leading-relaxed text-ink">“{card.epitaph}”</p>
          )}

          <dl class="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-gray">
            {card.cause && (
              <div>
                <dt class="inline">Cause of death: </dt>
                <dd class="inline text-ink">{card.cause}</dd>
              </div>
            )}
            {card.views > 0 && (
              <div>
                <dt class="inline">Visitors: </dt>
                <dd class="inline text-ink">{formatViews(card.views)}</dd>
              </div>
            )}
            {decayLabel(card.domain_state, card.domain_expires_at) && (
              <div>
                <dt class="inline">Domain: </dt>
                <dd class={`inline ${card.domain_state === "lapsed" ? "text-pink" : "text-ink"}`}>
                  {decayLabel(card.domain_state, card.domain_expires_at)}
                </dd>
              </div>
            )}
            {card.handle && (
              <div>
                <dt class="inline">Buried by </dt>
                <dd class="inline">
                  <a
                    href={`https://x.com/${card.handle}`}
                    target="_blank"
                    rel="noopener"
                    class="text-teal hover:underline"
                  >
                    @{card.handle}
                  </a>
                </dd>
              </div>
            )}
          </dl>

          {/* Mausoleums and pyramids paid for the extra room. */}
          {card.description && (
            <p class="pxbox mt-6 max-w-xl p-5 text-left text-[14px] leading-relaxed text-gray">
              {card.description}
            </p>
          )}

          {card.url && (
            <p class="mt-5 text-[13px]">
              <a href={card.url} target="_blank" rel="noopener nofollow" class="text-teal hover:underline">
                {card.url.replace(/^https?:\/\//, "")} ↗
              </a>
            </p>
          )}

          <p class="pixel mt-6 text-[11px] text-gray">
            {TIER[card.tier].label} · buried at THE BONEYARD
          </p>

          <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href={shareHref} target="_blank" rel="noopener" class="pxbtn text-[13px]">
              SHARE ON X
            </a>
            <a href="/bury" class="pxbtn pxbtn--ghost text-[13px]">
              Bury yours too
            </a>
          </div>
        </div>

        {nearby.length > 0 && (
          <section class="mt-16">
            <h2 class="pixel mb-3 text-[13px] text-gray">RECENTLY BURIED NEARBY</h2>
            <div class="grid grid-cols-3 items-end gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {nearby.map((n) => (
                <TombPlot card={n} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
