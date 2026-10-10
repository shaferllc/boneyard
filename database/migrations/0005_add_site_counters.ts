import type { Migration } from "@shaferllc/keel/core";

/**
 * Site-wide counters.
 *
 * A key/value table rather than a column on a settings row, because there is
 * exactly one counter today and guessing which ones come later is how you end up
 * with a `stats` table full of nulls. Adding the second one is an INSERT.
 *
 * The row is seeded here so the hot path can be a bare `increment()` — an upsert
 * on every page view to handle a row that is missing exactly once is the wrong
 * trade.
 */
const migration: Migration = {
  name: "0005_add_site_counters",

  async up(schema) {
    await schema.createTable("counters", (t) => {
      t.string("key", 40).unique();
      t.integer("value").default(0);
    });

    await schema.raw("INSERT INTO counters (key, value) VALUES ('site_views', 0)");
  },

  async down(schema) {
    await schema.dropTable("counters");
  },
};

export default migration;
