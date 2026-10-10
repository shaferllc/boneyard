import type { Migration } from "@shaferllc/keel/core";

/**
 * The domain watch.
 *
 * Every other column on a grave is typed in once and frozen. These three are the
 * opposite: a nightly sweep asks the registry whether the startup's domain is
 * still paid for, and the answer decides how far the headstone has crumbled.
 *
 * `domain_state` is stored rather than derived at read time on purpose. It could
 * be computed from `domain_expires_at` on every render, but then a grave whose
 * domain 404s at the registry — never registered, or already released — has no
 * expiry date to compute from and would read as "alive". The sweep knows the
 * difference between "expires in 400 days" and "the registry has never heard of
 * it"; a `CASE` in a query does not.
 *
 * Default `unknown`, which is also the flag: the UI renders nothing for it, so
 * the feature stays invisible until a sweep has actually put real data in.
 */
const migration: Migration = {
  name: "0003_add_domain_watch",

  async up(schema) {
    await schema.alterTable("graves", (t) => {
      // unknown | alive | expiring | lapsed
      t.string("domain_state", 12).default("unknown");
      // Registry expiry, ISO. Null when the registry gave no expiration event.
      t.string("domain_expires_at", 32).nullable();
      // When we last got an answer — not when we last asked. A failed lookup
      // leaves this alone so a flaky night is visible as a stale date.
      t.string("domain_checked_at", 32).nullable();
    });
  },

  async down(schema) {
    await schema.alterTable("graves", (t) => {
      t.dropColumn("domain_state");
      t.dropColumn("domain_expires_at");
      t.dropColumn("domain_checked_at");
    });
  },
};

export default migration;
