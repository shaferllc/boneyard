import type { ConfigData } from "@shaferllc/keel/core";

/**
 * Config for the Worker.
 *
 * `boot()` discovers `config/*.ts` from the filesystem, which a Worker has none of —
 * it fails quietly and every route 500s on an undefined `app.key`. And the config
 * modules call `env()` at module-evaluation time, so a static import would read the
 * bindings before they exist. Hence: copy bindings into `process.env`, *then*
 * `import()`.
 */
export async function edgeConfig(bindings: Record<string, unknown>): Promise<ConfigData> {
  for (const [key, value] of Object.entries(bindings)) {
    // Vars and secrets are strings; anything else is a live binding (D1) and has
    // no business in process.env.
    if (typeof value === "string") process.env[key] = value;
  }

  const [app, database, stripe] = await Promise.all([
    import("../config/app.js"),
    import("../config/database.js"),
    import("../config/stripe.js"),
  ]);

  return { app: app.default, database: database.default, stripe: stripe.default };
}
