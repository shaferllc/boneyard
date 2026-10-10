/**
 * Stripe, over `fetch`.
 *
 * The official SDK is not used, and that is a decision rather than an omission:
 * this app makes exactly one kind of API call (create a Checkout Session) and
 * verifies one kind of signature. That is about sixty lines against a dependency
 * that has to be shimmed for Workers. Everything below is WebCrypto and
 * `application/x-www-form-urlencoded`, both of which the runtime already has.
 *
 * The money rule, in one sentence: **nothing is published until Stripe says it was
 * paid.** A row is written before checkout so the webhook has something to point
 * at, but every read filters on `paid_at`, so an abandoned checkout leaves an
 * invisible orphan rather than a free grave.
 */

import { config } from "@shaferllc/keel/core";

export interface CheckoutLine {
  /** Shown on the Stripe page. */
  name: string;
  description?: string;
  /** Whole dollars. Converted to cents here so no caller has to remember to. */
  dollars: number;
}

export interface CheckoutRequest extends CheckoutLine {
  /** Our own id for the thing being bought, echoed back by the webhook. */
  reference: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Is Stripe wired up?
 *
 * `rk_` is a restricted key: same API surface as `sk_` for the single call this
 * app makes, but scoped to Checkout Sessions and nothing else. It is the better
 * key to deploy, so it has to satisfy this check too — a prefix test that only
 * knows `sk_` silently disables payments for the safer of the two.
 */
export function stripeConfigured(): boolean {
  const secret = config<string>("stripe.secret", "");
  return secret.startsWith("sk_") || secret.startsWith("rk_");
}

/**
 * May a paid tier be handed out without going through Stripe?
 *
 * Only off a production deploy. On a fresh clone or `npm run dev` there are no
 * keys, and demanding them would make the site unusable to look at — but the same
 * leniency in production is a $200 pyramid for free to anyone who finds the form,
 * so production refuses instead. That is the whole reason this is a function and
 * not `!stripeConfigured()` inlined at both call sites.
 */
export function mayBypassPayment(): boolean {
  return !stripeConfigured() && config<string>("app.env", "local") !== "production";
}

/** Configured for real money, or explicitly allowed to skip it. Neither: refuse. */
export function paymentsUnavailable(): boolean {
  return !stripeConfigured() && !mayBypassPayment();
}

function form(params: Record<string, string | number | undefined>): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") body.append(key, String(value));
  }
  return body.toString();
}

/**
 * Create a Checkout Session and return the URL to send the buyer to.
 *
 * `client_reference_id` carries our row id through Stripe and back; it is what the
 * webhook uses to decide what was actually bought, rather than trusting anything
 * in the redirect the browser follows afterwards.
 */
export async function createCheckoutSession(request: CheckoutRequest): Promise<string> {
  const secret = config<string>("stripe.secret", "");
  if (!secret) throw new Error("Stripe is not configured");

  const params: Record<string, string | number> = {
    mode: "payment",
    client_reference_id: request.reference,
    success_url: request.successUrl,
    cancel_url: request.cancelUrl,
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": config<string>("stripe.currency", "usd"),
    "line_items[0][price_data][unit_amount]": Math.round(request.dollars * 100),
    "line_items[0][price_data][product_data][name]": request.name,
  };

  if (request.description) {
    params["line_items[0][price_data][product_data][description]"] = request.description;
  }

  for (const [key, value] of Object.entries(request.metadata ?? {})) {
    params[`metadata[${key}]`] = value;
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Without this a retried POST can create a second session — and, worse, a
      // second charge. The reference is unique per row, which is exactly the
      // granularity an idempotency key wants.
      "Idempotency-Key": `checkout-${request.reference}`,
    },
    body: form(params),
  });

  const payload = (await response.json()) as { url?: string; error?: { message?: string } };

  if (!response.ok || !payload.url) {
    throw new Error(`Stripe rejected the checkout session: ${payload.error?.message ?? response.status}`);
  }

  return payload.url;
}

/* ------------------------------------------------------------- signatures */

const encoder = new TextEncoder();

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time compare. A `===` here leaks the signature one byte at a time. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a `Stripe-Signature` header against the raw request body.
 *
 * This is the trust boundary of the whole payment path — anyone on the internet
 * can POST to the webhook route, and an unverified body is an attacker telling us
 * which graves have been paid for. Three things are checked, and all three matter:
 * the header parses, the HMAC matches, and the timestamp is recent enough that a
 * captured request cannot be replayed later.
 *
 * The body must be the exact bytes Stripe sent. Re-serialising parsed JSON changes
 * the signed payload and every event then fails to verify.
 */
export async function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
  now: number = Date.now(),
): Promise<boolean> {
  if (!secret || !signatureHeader) return false;

  // "t=1699999999,v1=abc...,v1=def..." — more than one v1 during a secret roll.
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.trim().split("=");
    if (key === "t" && value) timestamp = value;
    if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  const age = Math.abs(now / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const expected = hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`)));

  return signatures.some((candidate) => safeEqual(candidate, expected));
}
