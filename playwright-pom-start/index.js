#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { createRequire } from "module";

const cwd = process.cwd();
const utilsDir = path.join(cwd, "utils");
const loggerCandidates = ["logger.js", "logger.ts", "Logger.js", "Logger.ts"];
const loggerBackups = new Map();
for (const file of loggerCandidates) {
  const loggerPath = path.join(utilsDir, file);
  if (fs.existsSync(loggerPath)) {
    loggerBackups.set(loggerPath, fs.readFileSync(loggerPath, "utf-8"));
  }
}

const require = createRequire(import.meta.url);
const binPath = require.resolve("playwright-pom/bin/index.js");
const result = spawnSync(process.execPath, [binPath, ...process.argv.slice(2)], {
  stdio: "inherit",
});

for (const [loggerPath, content] of loggerBackups.entries()) {
  try {
    fs.mkdirSync(path.dirname(loggerPath), { recursive: true });
    fs.writeFileSync(loggerPath, content, "utf-8");
  } catch {
    // ignore
  }
}

const pkgPath = path.join(cwd, "package.json");
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
    // ignore
  }
}

process.exit(result.status ?? 1);
