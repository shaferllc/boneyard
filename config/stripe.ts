import { env } from "@shaferllc/keel/core";

/**
 * Stripe.
 *
 * Both values are secrets and neither has a default worth shipping: with no
 * `secret` the site runs in the local mode described in `app/Domain/stripe.ts`,
 * and with no `webhook_secret` incoming webhooks are rejected outright rather
 * than trusted. An empty string must never read as "fine".
 *
 * On Cloudflare these are `wrangler secret put`, not `vars` — a key in
 * wrangler.jsonc is a key in the repository.
 */
export default {
  secret: env("STRIPE_SECRET_KEY", ""),
  webhook_secret: env("STRIPE_WEBHOOK_SECRET", ""),
  currency: env("STRIPE_CURRENCY", "usd"),
};
