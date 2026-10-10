import type { Migration } from "@shaferllc/keel/core";

/**
 * Visitor counts.
 *
 * One integer on the grave, incremented atomically per page view. It is not
 * analytics and is not trying to be: no sessions, no uniques, no time series —
 * a headstone with a number under it, which is the only part anyone who buried a
 * startup actually wants to see.
 *
 * NOT NULL with a default, so every existing grave starts at zero rather than at
 * null and every read can add without a coalesce.
 */
const migration: Migration = {
  name: "0004_add_view_count",

  async up(schema) {
    await schema.alterTable("graves", (t) => {
      t.integer("views").default(0);
    });
  },

  async down(schema) {
    await schema.alterTable("graves", (t) => {
      t.dropColumn("views");
    });
  },
};

export default migration;
