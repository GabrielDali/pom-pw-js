#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const binPath = require.resolve("playwright-pom/bin/index.js");
const result = spawnSync(process.execPath, [binPath, ...process.argv.slice(2)], {
  stdio: "inherit",
});


const pkgPath = path.join(process.cwd(), "package.json");
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    let changed = false;

    if (pkg.main !== "index.js") {
      pkg.main = "index.js";
      changed = true;
    }

    if (!pkg.type || pkg.type !== "module") {
      pkg.type = "module";
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    }
  } catch {
    // ignore parse errors
  }
}

process.exit(result.status ?? 1);
