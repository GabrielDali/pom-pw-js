#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { askLanguage } from "../lib/prompt.js";
import { getProjectPath } from "../lib/helpers.js";
import { runScaffold, isAlreadyScaffolded, runAddPages } from "../lib/scaffold.js";
import { detectPlaywrightLang, runInstallIfPresent } from "../lib/playwright.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(__dirname, "..");

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "add" && args[1] === "pages") {
    const success = await runAddPages(process.cwd());
    process.exit(success ? 0 : 1);
  }

  let projectName = args[0];
  const currentPath = process.cwd();
  const dirBasename = path.basename(currentPath);
  const singleArgIsCurrentDir = projectName === dirBasename;
  const usingCurrentDir = !projectName || singleArgIsCurrentDir;

  if (!projectName || singleArgIsCurrentDir) {
    projectName = dirBasename;
  }

  const targetPath = usingCurrentDir ? currentPath : getProjectPath(currentPath, projectName);

  if (isAlreadyScaffolded(targetPath)) {
    console.log("Project already set up. Skipping.");
    runInstallIfPresent(targetPath);
    process.exit(0);
  }

  if (!usingCurrentDir && fs.existsSync(targetPath)) {
    console.log(`Folder "${projectName}" already exists.`);
    process.exit(1);
  }

  let lang = detectPlaywrightLang(targetPath);
  if (lang) {
    console.log(`Playwright already installed. Using ${lang === "ts" ? "TypeScript" : "JavaScript"} (detected from project).`);
  } else {
    lang = await askLanguage();
  }

  const templatesPath = path.join(packageRoot, "templates", lang);

  if (!fs.existsSync(templatesPath)) {
    console.log(`Templates folder for "${lang}" was not found at ${templatesPath}.`);
    process.exit(1);
  }

  await runScaffold({ projectName, targetPath, lang, packageRoot });
}

main();
