import { HttpKernel, serveStatic, sessionMiddleware } from "@shaferllc/keel/core";
import type { Application } from "@shaferllc/keel/core";

import { requestLogger } from "./Middleware/requestLogger.js";

/** Cloudflare sets this; it is the standard way to ask "am I on the edge?". */
const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/**
 * Global middleware — runs on every request, in order.
 *
 * `serveStatic` is Node-only here, deliberately. It reads the filesystem, and while
 * the import is dynamic (so the module loads on the edge) the read itself has
 * nothing to read from inside a Worker. On Cloudflare it is also redundant:
 * `assets` in wrangler.jsonc serves ./public from Cloudflare's own edge before a
 * request ever reaches this code, so /assets/app.css never gets here.
 */
export class Kernel extends HttpKernel {
  constructor(app: Application) {
    super(app);

    this.use(requestLogger);
    if (!onWorkers) this.use(serveStatic({ root: "./public" }));
    this.use(sessionMiddleware());
  }
}
