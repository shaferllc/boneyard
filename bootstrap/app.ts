/**
 * Application bootstrap. Creates the container, boots providers, loads routes.
 * The server, the console, and the Worker all enter through here.
 */

import { Application, Router, HttpKernel, type BootOptions, type ProviderClass } from "@shaferllc/keel/core";

import { Kernel } from "../app/Http/Kernel.js";
import registerWebRoutes from "../routes/web.js";

/**
 * The Node provider list is loaded lazily, and that is not a style choice.
 *
 * A static `import` here would pull the Node providers into the Worker bundle
 * even though the Worker passes its own list — and one of them (Watch) resolves
 * its own directory with `fileURLToPath` at module load, which throws during
 * Worker startup validation. Deferring the import means the module is only
 * evaluated when something actually asks for the Node defaults.
 */
export async function createApplication(
  providers?: ProviderClass[],
  options?: BootOptions,
): Promise<Application> {
  const app = new Application(process.cwd());

  // Binding our Kernel under HttpKernel is what makes `keel serve` use it. Without
  // this the console falls back to a bare HttpKernel and the global middleware
  // quietly vanishes.
  app.singleton(HttpKernel, (container) => new Kernel(container as Application));

  await app.boot(providers ?? (await import("./providers.js")).providers, options);
  registerWebRoutes(app.make(Router));

  return app;
}
