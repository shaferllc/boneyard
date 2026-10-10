import Layout from "./layout.js";
import { EmblemSwatch, ShapeSwatch, Stone, STONE_ASPECT, STONE_TEXT_TOP } from "./art.js";
import { CAUSES, EMBLEMS, SHAPES, TIERS, type TierKey } from "../../app/Domain/graveyard.js";

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Mirror the name into the preview stone. Two lines beats a framework. */
const LIVE_NAME = `document.querySelectorAll('[data-preview-name]').forEach(function(n){n.textContent=this.value||'your startup'},this)`;

export default function Bury({
  tier,
  slot,
  errors = [],
  values = {},
  siteViews,
}: {
  tier: TierKey;
  slot: number | null;
  errors?: string[];
  values?: Record<string, string>;
  siteViews?: number | null;
}) {
  return (
    <Layout siteViews={siteViews} title="Bury your startup — the boneyard" description="Give it the send-off it deserves." chrome={false}>
      <div class="wrap max-w-3xl py-8">
        <a href="/" class="text-[12px] text-teal hover:underline">
          ← back to the graveyard
        </a>

        <h1 class="pixel mt-5 text-[20px]">BURY YOUR STARTUP</h1>
        <p class="mt-1 text-[13px] text-gray">Give it the send-off it deserves.</p>

        {errors.length > 0 && (
          <ul class="pxbox mt-5 border-yellow p-4 text-[13px] text-ink">
            {errors.map((e) => (
              <li>· {e}</li>
            ))}
          </ul>
        )}

        {/*
          One <form>, no client framework. The live bits (preview stone, submit
          price) are CSS `:has()` reading the radios — a preview that costs nothing
          to ship and cannot get out of sync with the form.
        */}
        <form method="post" action="/bury" class="mt-7 space-y-7" id="bury">
          {slot ? <input type="hidden" name="slot" value={String(slot)} /> : <></>}

          <div class="grid gap-5 sm:grid-cols-2">
            <label class="block">
              <span class="pixel text-[12px]">
                Startup name <span class="text-yellow">*</span>
              </span>
              <input
                class="field mt-1.5"
                name="name"
                required
                maxlength={80}
                value={values.name ?? ""}
                placeholder="Loopr"
                oninput={LIVE_NAME}
              />
            </label>

            <label class="block">
              <span class="pixel text-[12px]">Startup URL</span>
              <input class="field mt-1.5" name="url" value={values.url ?? ""} placeholder="loopr.io" />
              <span class="mt-1 block text-[11px] text-gray">add the website and its logo goes on the grave</span>
            </label>
          </div>

          <div class="grid gap-5 sm:grid-cols-3">
            <label class="block">
              <span class="pixel text-[12px]">Died — month</span>
              <select class="field mt-1.5" name="month">
                <option value="">—</option>
                {MONTHS.map((m, i) => (
                  <option value={String(i + 1)} selected={values.month === String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label class="block">
              <span class="pixel text-[12px]">Died — year</span>
              <select class="field mt-1.5" name="year">
                <option value="">—</option>
                {YEARS.map((y) => (
                  <option value={String(y)} selected={values.year === String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </label>

            <label class="block">
              <span class="pixel text-[12px]">Cause of death</span>
              <select class="field mt-1.5" name="cause">
                <option value="">Select…</option>
                {CAUSES.map((c) => (
                  <option value={c} selected={values.cause === c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <label class="block">
              <span class="pixel text-[12px]">Your X handle</span>
              <input class="field mt-1.5" name="handle" value={values.handle ?? ""} placeholder="@you" />
              <span class="mt-1 block text-[11px] text-gray">optional — it goes on the grave as "buried by"</span>
            </label>

            <label class="block">
              <span class="pixel text-[12px]">Epitaph</span>
              <input
                class="field mt-1.5"
                name="epitaph"
                maxlength={120}
                value={values.epitaph ?? ""}
                placeholder="Shipped fast. Died faster."
              />
              <span class="mt-1 block text-[11px] text-gray">tombs and above · 120 characters, carved forever</span>
            </label>
          </div>

          <label class="block">
            <span class="pixel text-[12px]">The long version</span>
            <textarea
              class="field mt-1.5"
              name="description"
              rows={3}
              maxlength={600}
              placeholder="What it was, who it was for, and what actually killed it."
            >
              {values.description ?? ""}
            </textarea>
            <span class="mt-1 block text-[11px] text-gray">mausoleums and pyramids only</span>
          </label>

          {/* ------------------------------------------------------- tier */}
          <fieldset>
            <legend class="pixel text-[12px]">Burial tier</legend>
            <div class="pick mt-3 grid gap-3 sm:grid-cols-2">
              {TIERS.map((t) => (
                <div>
                  <input type="radio" name="tier" id={`tier-${t.key}`} value={t.key} checked={t.key === tier} />
                  <label for={`tier-${t.key}`}>
                    <div class="flex items-baseline justify-between gap-2">
                      <span class="pixel text-[13px]">{t.label}</span>
                      <span class="pixel text-[13px] text-yellow">{t.price === 0 ? "Free" : `$${t.price}`}</span>
                    </div>
                    <p class="mt-1 text-[12px] leading-snug text-gray">{t.blurb}</p>
                  </label>
                </div>
              ))}
            </div>
          </fieldset>

          {/* ------------------------------------------------------ shape */}
          <fieldset>
            <legend class="pixel text-[12px]">Headstone shape</legend>
            <div class="pick mt-3 grid grid-cols-3 gap-3">
              {SHAPES.map((s) => (
                <div>
                  <input type="radio" name="shape" id={`shape-${s}`} value={s} checked={s === (values.shape ?? "classic")} />
                  <label for={`shape-${s}`} class="text-center">
                    <div class="flex h-14 items-end justify-center">
                      <ShapeSwatch shape={s} />
                    </div>
                    <span class="pixel mt-1 block text-[11px] capitalize">{s}</span>
                  </label>
                </div>
              ))}
            </div>
          </fieldset>

          {/* ----------------------------------------------------- emblem */}
          <fieldset>
            <legend class="pixel text-[12px]">Emblem</legend>
            <div class="pick mt-3 grid grid-cols-4 gap-3 sm:grid-cols-7">
              {EMBLEMS.map((e) => (
                <div>
                  <input type="radio" name="emblem" id={`emblem-${e}`} value={e} checked={e === (values.emblem ?? "plain")} />
                  <label for={`emblem-${e}`} class="text-center">
                    <div class="flex h-10 items-center justify-center">
                      <EmblemSwatch kind={e} />
                    </div>
                    <span class="mt-1 block text-[10px] capitalize text-gray">{e}</span>
                  </label>
                </div>
              ))}
            </div>
          </fieldset>

          {/* ---------------------------------------------------- preview */}
          <div class="pxbox p-6">
            <p class="pixel mb-4 text-[12px] text-gray">HOW IT WILL LOOK</p>
            <div class="flex items-end justify-center gap-6">
              {SHAPES.map((s) => (
                <div class={`preview preview-${s} relative w-28`} style={`aspect-ratio:${STONE_ASPECT[s]}`}>
                  <Stone shape={s} emblem="plain" />
                  <div class="absolute inset-x-0 px-[20%] text-center" style={`top:${STONE_TEXT_TOP[s]}`}>
                    <p class="pixel truncate text-[10px] text-carve" data-preview-name>
                      your startup
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p class="mt-3 text-center text-[11px] text-gray">
              The emblem you picked above is carved near the base.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-4">
            <button type="submit" class="pxbtn text-[14px]">
              BURY IT —{" "}
              {TIERS.map((t) => (
                <span class={`price price-${t.key}`}>{t.price === 0 ? "FREE" : `$${t.price}`}</span>
              ))}
            </button>
            <span class="text-[11px] text-gray">No account. No email. It is buried the moment you submit.</span>
          </div>
        </form>
      </div>

      {/*
        Only the selected shape's preview and the selected tier's price are shown.
        `:has()` on the form means no JavaScript is involved in keeping either of
        them honest.
      */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .preview, .price { display: none; }
        #bury:has(#shape-classic:checked) .preview-classic,
        #bury:has(#shape-cross:checked) .preview-cross,
        #bury:has(#shape-gothic:checked) .preview-gothic { display: block; }
        #bury:has(#tier-mass:checked) .price-mass,
        #bury:has(#tier-tomb:checked) .price-tomb,
        #bury:has(#tier-mausoleum:checked) .price-mausoleum,
        #bury:has(#tier-pyramid:checked) .price-pyramid { display: inline; }
      `,
        }}
      />
    </Layout>
  );
}
