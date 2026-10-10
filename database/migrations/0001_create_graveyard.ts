import type { Migration } from "@shaferllc/keel/core";

/**
 * The graveyard.
 *
 * Two tables, and the interesting one is `graves`. A grave is immutable once
 * bought: the tier decides how large it is drawn and how much of it is rendered,
 * and there is deliberately no edit route. People pay for a headstone, not for a
 * CMS — and "the epitaph can never be changed" is a feature of an epitaph.
 *
 * `slot` exists only for pyramids. Three of them, numbered 1–3, enforced by a
 * unique index rather than by whichever controller happens to be writing: two
 * people paying $200 for slot 2 at the same moment is exactly the race worth
 * losing at the database rather than in application code.
 */
const migration: Migration = {
  name: "0001_create_graveyard",

  async up(schema) {
    await schema.createTable("graves", (t) => {
      t.id();
      t.string("slug", 80).unique();
      t.string("name", 80);
      t.string("tier", 16); // mass | tomb | mausoleum | pyramid

      // Pyramids only. Null everywhere else, which is why the index is partial-ish:
      // SQLite treats NULLs as distinct, so unlimited non-pyramids coexist here.
      t.integer("slot").nullable();

      t.string("url", 300).nullable();
      t.string("logo_url", 300).nullable();

      // "YYYY-MM", or null for the ones nobody can date. Not a DATE column: the
      // day of death is never known and a fabricated one would print as fact.
      t.string("died", 7).nullable();
      t.string("cause", 40).nullable();
      t.string("handle", 20).nullable(); // buried by @…

      t.string("shape", 16).default("classic");
      t.string("emblem", 16).default("plain");

      t.text("epitaph").nullable();
      t.text("description").nullable(); // mausoleums and pyramids only

      // When the money cleared. Null would mean an unpaid hold; nothing writes
      // that yet (see BuryController) but the column is where Stripe lands.
      t.string("paid_at", 32).nullable();

      t.timestamps();
      t.index("tier");
      t.uniqueIndex(["slot"]);
    });

    await schema.createTable("sponsors", (t) => {
      t.id();
      t.string("name", 80);
      t.string("url", 300);
      t.string("logo_url", 300).nullable();
      t.string("tagline", 200).nullable();

      // ISO instant. A sponsor is live while now() < expires_at; expiry is read at
      // query time rather than swept by a cron, so nothing has to run on schedule
      // for a lapsed sponsor to stop showing.
      t.string("expires_at", 32);

      t.timestamps();
      t.index("expires_at");
    });
  },

  async down(schema) {
    await schema.dropTable("sponsors");
    await schema.dropTable("graves");
  },
};

export default migration;
