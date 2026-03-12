#!/usr/bin/env node

import { spawnSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const binPath = require.resolve("playwright-pom/bin/index.js");
const result = spawnSync(process.execPath, [binPath, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
