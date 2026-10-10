/**
 * The Cloudflare Workers entry. `wrangler dev` / `wrangler deploy` use this.
 *
 * D1's binding only exists inside a request, so the connection is wired here before
 * the app boots — and the app is built once, then reused.
 */

import { setConnection, HttpKernel } from "@shaferllc/keel/core";
import { d1Connection, type D1Like } from "@shaferllc/keel/db/d1";

import { sweepDomains } from "./app/Domain/decay.js";
import { isPageRequest, recordPageView } from "./app/Domain/stats.js";
import { looksAutomated } from "./app/Domain/graveyard.js";
import { createApplication } from "./bootstrap/app.js";
import { edgeProviders } from "./bootstrap/providers.edge.js";
import { edgeConfig } from "./bootstrap/config.edge.js";

interface Env {
  DB: D1Like;
}

let handler: { fetch: (request: Request, env: unknown) => Response | Promise<Response> } | undefined;

/**
 * Both entry points need the same booted app, and the cron fires on an isolate
 * that has never served a request — so this cannot live inside `fetch`.
 */
async function boot(env: Env): Promise<void> {
  if (handler) return;

  setConnection(d1Connection(env.DB), "sqlite");

  const app = await createApplication(edgeProviders, {
    discoverConfig: false,
    config: await edgeConfig(env as unknown as Record<string, unknown>),
  });
  handler = app.make(HttpKernel).build();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // `www` and the apex are both custom domains on this Worker, so without this
    // every page exists at two URLs with identical content and search engines
    // split the signal between them. 301 rather than a canonical tag: it is the
    // stronger signal, and it costs one comparison per request.
    const url = new URL(request.url);
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    await boot(env);

    // The site-wide counter lives here rather than in a controller because this is
    // the only place that sees every request exactly once — ten `view()` call
    // sites would each have to remember, and the one that forgot would undercount
    // silently. Awaited, not `waitUntil`: the footer reads this number a
    // millisecond later, and a counter that lags its own page view reads as broken.
    if (request.method === "GET" && isPageRequest(url.pathname) && !looksAutomated(request.headers.get("user-agent"))) {
      await recordPageView();
    }

    return handler!.fetch(request, env);
  },

  /**
   * Nightly domain watch. Awaited rather than handed to `waitUntil`: the sweep is
   * the entire point of the invocation, and a scheduled handler that returns early
   * gets its isolate torn down mid-fetch.
   */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    await boot(env);
    const result = await sweepDomains();
    console.log(`domain sweep: checked=${result.checked} updated=${result.updated} failed=${result.failed}`);
  },
};
