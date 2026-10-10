import Layout from "./layout.js";
import { Bones } from "./art.js";
import { SPONSOR_DAYS, SPONSOR_PLOTS, SPONSOR_PRICE } from "../../app/Domain/graveyard.js";

export default function SponsorPage({
  taken,
  errors = [],
  values = {},
  siteViews,
}: {
  taken: number;
  errors?: string[];
  values?: Record<string, string>;
  siteViews?: number | null;
}) {
  const left = Math.max(0, SPONSOR_PLOTS - taken);

  return (
    <Layout
      siteViews={siteViews}
      title="Sponsor the graveyard — the boneyard"
      description="Your logo in front of every founder who comes here to grieve."
      chrome={false}
    >
      <div class="wrap max-w-2xl py-8">
        <a href="/" class="text-[12px] text-teal hover:underline">
          ← back to the graveyard
        </a>

        <div class="mt-5 flex items-center gap-3">
          <Bones class="w-10" />
          <h1 class="pixel text-[20px]">SPONSOR THE GRAVEYARD</h1>
        </div>
        <p class="mt-2 text-[13px] text-gray">
          Your logo in front of every founder who comes here to grieve. Pay, and you are live instantly.
        </p>

        <p class="mt-4 text-[13px] text-gray">
          <span class="pixel text-ink">{left}</span> of {SPONSOR_PLOTS} plots left · <span class="pixel">{taken}</span>{" "}
          taken.
        </p>

        <p class="pixel mt-5 text-[16px]">
          <span class="text-yellow">${SPONSOR_PRICE}</span>{" "}
          <span class="text-[13px] font-normal text-gray">
            — {SPONSOR_DAYS} days everywhere: the top bar on mobile, the side rails on desktop.
          </span>
        </p>

        {errors.length > 0 && (
          <ul class="pxbox mt-5 border-yellow p-4 text-[13px]">
            {errors.map((e) => (
              <li>· {e}</li>
            ))}
          </ul>
        )}

        {left === 0 ? (
          <p class="pxbox mt-7 p-5 text-[13px] text-gray">
            Every plot is taken. Come back when one lapses — they run {SPONSOR_DAYS} days.
          </p>
        ) : (
          <form method="post" action="/sponsor" class="mt-7 space-y-5">
            <label class="block">
              <span class="pixel text-[12px]">
                Company name <span class="text-yellow">*</span>
              </span>
              <input class="field mt-1.5" name="name" required maxlength={80} value={values.name ?? ""} />
            </label>

            <label class="block">
              <span class="pixel text-[12px]">
                Website <span class="text-yellow">*</span>
              </span>
              <input class="field mt-1.5" name="url" required value={values.url ?? ""} placeholder="example.com" />
            </label>

            <label class="block">
              <span class="pixel text-[12px]">Logo URL</span>
              <input class="field mt-1.5" name="logo_url" value={values.logo_url ?? ""} />
              <span class="mt-1 block text-[11px] text-gray">
                leave it blank and the favicon of your site is used
              </span>
            </label>

            <label class="block">
              <span class="pixel text-[12px]">One-liner</span>
              <input class="field mt-1.5" name="tagline" maxlength={200} value={values.tagline ?? ""} />
              <span class="mt-1 block text-[11px] text-gray">shows under your logo on desktop · 200 max</span>
            </label>

            <button type="submit" class="pxbtn text-[14px]">
              Go live — ${SPONSOR_PRICE}
            </button>
            <p class="text-[11px] text-gray">Your logo appears the second it is submitted. No emails, no calls.</p>
          </form>
        )}
      </div>
    </Layout>
  );
}
