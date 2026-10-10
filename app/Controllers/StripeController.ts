import type { Ctx } from "@shaferllc/keel/core";
import { config } from "@shaferllc/keel/core";

import { Grave } from "../Models/Grave.js";
import { Sponsor } from "../Models/Sponsor.js";
import { verifyWebhook } from "../Domain/stripe.js";
import { sponsorExpiry } from "./SponsorController.js";

interface CheckoutSession {
  id?: string;
  client_reference_id?: string | null;
  payment_status?: string;
}

interface StripeEvent {
  type?: string;
  data?: { object?: CheckoutSession };
}

/**
 * The only route that turns an unpaid row into a published one.
 *
 * Everything here is written on the assumption that the request is hostile until
 * the signature says otherwise, and that Stripe will deliver the same event more
 * than once — both of which are true.
 */
export class StripeController {
  async webhook(c: Ctx) {
    const secret = config<string>("stripe.webhook_secret", "");

    // No secret configured means no way to tell Stripe from anyone else, so there
    // is nothing safe to do with the body. Refuse rather than trust it.
    if (!secret) {
      console.error("stripe webhook received but STRIPE_WEBHOOK_SECRET is not set");
      return c.json({ error: "not configured" }, 500);
    }

    // The raw bytes, not re-serialised JSON — the signature is over exactly what
    // was sent, and `JSON.stringify(JSON.parse(body))` is not that.
    const raw = await c.req.text();

    if (!(await verifyWebhook(raw, c.req.header("stripe-signature") ?? null, secret))) {
      return c.json({ error: "bad signature" }, 400);
    }

    let event: StripeEvent;
    try {
      event = JSON.parse(raw) as StripeEvent;
    } catch {
      return c.json({ error: "bad payload" }, 400);
    }

    if (event.type !== "checkout.session.completed") {
      // Everything else is acknowledged and ignored, so Stripe stops retrying it.
      return c.json({ ok: true, ignored: event.type });
    }

    const session = event.data?.object ?? {};
    if (session.payment_status !== "paid") return c.json({ ok: true, unpaid: true });

    const [kind, id] = String(session.client_reference_id ?? "").split(":");
    const rowId = Number(id);
    if (!rowId) return c.json({ ok: true, unknown: true });

    const paidAt = new Date().toISOString();

    if (kind === "grave") {
      const grave = await Grave.find(rowId);
      // Already settled: a redelivery of an event we have handled. Acknowledge it
      // and change nothing.
      if (!grave || grave.paid_at) return c.json({ ok: true });

      grave.paid_at = paidAt;
      grave.checkout_id = session.id ?? null;
      await grave.save();

      return c.json({ ok: true, buried: grave.slug });
    }

    if (kind === "sponsor") {
      const sponsor = await Sponsor.find(rowId);
      if (!sponsor || sponsor.paid_at) return c.json({ ok: true });

      sponsor.paid_at = paidAt;
      sponsor.checkout_id = session.id ?? null;
      // The thirty days start now, not when the form was submitted.
      sponsor.expires_at = sponsorExpiry();
      await sponsor.save();

      return c.json({ ok: true, sponsor: sponsor.name });
    }

    return c.json({ ok: true, unknown: kind });
  }
}
