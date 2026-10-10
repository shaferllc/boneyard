import type { ProviderClass } from "@shaferllc/keel/core";

/**
 * Providers for the Worker.
 *
 * DatabaseServiceProvider is absent on purpose — it reaches for `@libsql/client`
 * (net/tls). worker.ts binds D1 before boot instead. That leaves nothing, which is
 * the correct list rather than an oversight.
 */
export const edgeProviders: ProviderClass[] = [];
