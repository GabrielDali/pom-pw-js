import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

export function hasPlaywrightInstalled(targetPath) {
  const pkgPath = path.join(targetPath, "package.json");
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return "playwright" in deps || "@playwright/test" in deps;
  } catch {
    return false;
  }
}

export function detectPlaywrightLang(targetPath) {
  const configTs = [
    path.join(targetPath, "playwright.config.ts"),
    path.join(targetPath, "playwright.config.mts"),
  ].some((p) => fs.existsSync(p));
  const configJs = [
    path.join(targetPath, "playwright.config.js"),
    path.join(targetPath, "playwright.config.mjs"),
  ].some((p) => fs.existsSync(p));
  const hasTsConfig = fs.existsSync(path.join(targetPath, "tsconfig.json"));

  if (configTs || (hasTsConfig && configJs === false)) return "ts";
  if (configJs) return "js";

  const pkgPath = path.join(targetPath, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (!("playwright" in deps || "@playwright/test" in deps)) return null;
    if ("typescript" in deps) return "ts";
    return "js";
  } catch {
    return null;
  }
}

export function runPlaywrightInit(targetPath, lang) {
  console.log(`Installing Playwright (${lang.toUpperCase()})...`);
  const init = spawnSync(
    "npm",
    ["init", "playwright@latest", "--", "--quiet", `--lang=${lang}`],
    {
      cwd: targetPath,
      stdio: "inherit",
      shell: true,
    }
  );
  if (init.status !== 0) {
    console.warn(
      "Playwright init failed; run npm init playwright@latest in the project folder."
    );
  }
}

export function runInstallIfPresent(targetPath) {
  const pkgPath = path.join(targetPath, "package.json");
  if (!fs.existsSync(pkgPath)) return;
  spawnSync("npm", ["install"], {
    cwd: targetPath,
    stdio: "inherit",
    shell: true,
  });
}

