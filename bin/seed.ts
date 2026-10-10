#!/usr/bin/env tsx
/** Fill the graveyard: `npm run seed`. Idempotent — it clears first. */
import { createApplication } from "../bootstrap/app.js";
import { seed } from "../database/seed.js";

const app = await createApplication();

const result = await seed((message) => console.log(message));

console.log(`\nDone. ${result.graves} graves, ${result.sponsors} sponsors.`);

await app.terminate();
process.exit(0);
