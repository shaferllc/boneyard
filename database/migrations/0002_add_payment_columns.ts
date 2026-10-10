import type { Migration } from "@shaferllc/keel/core";

/**
 * Payment state.
 *
 * `graves.paid_at` already existed; sponsors get the matching column, and both get
 * `checkout_id` so a webhook can be traced back to the row it settled — and so a
 * duplicate delivery of the same event is recognisable rather than reapplied.
 *
 * Sponsors keep `expires_at` *and* gain `paid_at` rather than encoding "unpaid" as
 * an already-expired date. Both would have worked; only one of them reads as what
 * it means at 3am.
 */
const migration: Migration = {
  name: "0002_add_payment_columns",

  async up(schema) {
    await schema.alterTable("graves", (t) => {
      t.string("checkout_id", 80).nullable();
    });

    await schema.alterTable("sponsors", (t) => {
      t.string("paid_at", 32).nullable();
      t.string("checkout_id", 80).nullable();
    });
  },

  async down(schema) {
    await schema.alterTable("graves", (t) => {
      t.dropColumn("checkout_id");
    });

    await schema.alterTable("sponsors", (t) => {
      t.dropColumn("paid_at");
      t.dropColumn("checkout_id");
    });
  },
};

export default migration;
