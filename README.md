# Boneyard

A digital cemetery for dead startups. Bury yours, walk among other people's
failures, and pay for a nicer grave.

A clone of [ripstartups.lol](https://ripstartups.lol), built on
[Keel](../keel-project/keel) and deployed to Cloudflare Workers + D1.

**Live:** https://boneyard.flat-thunder-531a.workers.dev

> The graveyard is empty and **paid tiers are switched off** until Stripe keys are
> set — see *Going live* below. The mass grave still works.

```
npm install
npm run migrate
npm run seed        # 24 invented startups, so the graveyard isn't a field
npm run dev         # http://localhost:3000
```

## What it sells

| Tier | Price | What you get |
| --- | --- | --- |
| Mass grave | free | One line at the bottom. No stone, no page. |
| Tomb | $2 | A headstone: shape, emblem, epitaph, its own page. |
| Mausoleum | $50 | A building above the tombs, plus a description and a link out. |
| Pyramid | $200 | One of **three**, at the very top. |
| Sponsor plot | $49 | 30 days in the sidebars and the mobile top bar. |

Prices, tiers, causes of death, shapes and emblems all live in
`app/Domain/graveyard.ts`. That is the only file to edit to change the product.

## Payment

Stripe Checkout, called over `fetch` — no SDK. The rule the whole flow is built
around: **nothing is published until Stripe says it was paid.**

1. `POST /bury` writes the grave with `paid_at = NULL` and redirects to a Checkout
   Session carrying `client_reference_id = grave:<id>`.
2. Stripe posts `checkout.session.completed` to `POST /stripe/webhook`, which
   verifies the signature (HMAC-SHA256 over the raw body, with a 5-minute replay
   window) and sets `paid_at`.
3. Every read filters on `paid_at`, so an abandoned checkout leaves an invisible
   orphan rather than a free grave.

A grave whose webhook has not landed yet is still served at its own URL — with a
"still settling" notice and `noindex`, because Stripe's redirect regularly beats
its own webhook and a 404 seconds after paying is the worst possible moment to be
pedantic.

Unpaid **pyramid** holds are released after 30 minutes, checked at the next
purchase — pyramids are the only tier that can sell out, so an abandoned checkout
there takes a $200 plot off the market.

### Local development

With `STRIPE_SECRET_KEY` unset, burials complete without payment so the site works
on a fresh clone — but **only off production**. `APP_ENV=production` with no key
refuses the sale instead, because the same leniency on a live site is a $200
pyramid free to anyone who finds the form. That branch is
`mayBypassPayment()` / `paymentsUnavailable()` in `app/Domain/stripe.ts`, and it
has a test.

### Going live

```sh
wrangler secret put STRIPE_SECRET_KEY      # sk_live_…
wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_… from the endpoint you create
```

Both are secrets, never `vars` in `wrangler.jsonc` — a key in the config file is a
key in the repository. Point a Stripe webhook endpoint at
`https://<your-domain>/stripe/webhook` and subscribe it to
`checkout.session.completed`.

Test the webhook against a local server with `stripe listen --forward-to
localhost:3000/stripe/webhook`.

## Deploying

Already provisioned: D1 database `boneyard`
(`3d08515f-3b17-4cdf-84ba-3544422c1b44`), the `APP_KEY` secret, and the Worker.
Deploying a change is:

```sh
npm run deploy      # builds the CSS, then wrangler deploy
```

Migrations run through `keel migrate` when `CLOUDFLARE_API_TOKEN` is set. Without
one — the OAuth-only case — apply them with wrangler instead:

```sh
sqlite3 database.sqlite .schema > schema.sql   # after migrating locally
wrangler d1 execute boneyard --remote --file=schema.sql
```

`APP_URL` in `wrangler.jsonc` must stay the real origin: Stripe's success and
cancel URLs are built from it, and a stale value sends paying buyers to
localhost.

## The artwork

Every stone is inline SVG in the page — `resources/views/art.tsx`. No sprite
sheet, no icon package, no image requests. Each fill is a CSS variable, so the
whole graveyard recolours for dark mode without a single `dark:` class, and it
stays crisp at any size.

## Tests

```sh
npm test        # domain rules + Stripe signature verification
npm run typecheck
```
