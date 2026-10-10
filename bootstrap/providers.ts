import type { ProviderClass } from "@shaferllc/keel/core";

import { DatabaseServiceProvider } from "../app/Providers/DatabaseServiceProvider.js";

/**
 * Providers for the Node runtime (`keel serve`, the console, migrations).
 *
 * No AccountsServiceProvider: nobody logs in here. A grave is claimed by paying
 * for it, and the only thing a buyer gets back is a URL. Adding accounts would
 * add a password reset flow to a site whose entire interaction is one form.
 */
export const providers: ProviderClass[] = [DatabaseServiceProvider];
