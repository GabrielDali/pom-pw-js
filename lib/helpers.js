import fs from "fs";
import path from "path";
import readline from "readline";

export function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

export function isInvalidPageInput(pageName) {
  if (!pageName) return true;

  if (pageName.trim().toLowerCase() === "page") return true;

  if (pageName.includes(".js") || pageName.includes(".ts")) return true;

  if (!/^[a-zA-Z]+$/.test(pageName)) return true;

  return false;
}

export function getProjectPath(cwd, projectName) {
  return path.join(cwd, projectName);
}

export function findPagesFolder(cwd) {
  if (!fs.existsSync(cwd)) return null;
  const entries = fs.readdirSync(cwd, { withFileTypes: true });
  const match = entries.find(
    (e) => e.isDirectory() && e.name.toLowerCase() === "pages"
  );
  return match ? path.join(cwd, match.name) : null;
}

export function parsePageInputs(pagesInput) {
  if (!pagesInput || typeof pagesInput !== "string") return [];
  return pagesInput.trim().split(/\s+/).filter(Boolean);
}

const ext = (lang) => (lang === "ts" ? "ts" : "js");

export function getUniquePageFileNames(rawPageNames, lang = "js") {
  const seen = new Set();
  const result = [];
  const extension = ext(lang);
  for (const raw of rawPageNames) {
    if (isInvalidPageInput(raw)) continue;
    const className = normalizePageName(raw);
    if (seen.has(className)) continue;
    seen.add(className);
    result.push({ className, fileName: `${className}.${extension}` });
  }
  return result;
}

export function getPageContentsToWrite(specs, lang = "js") {
  return specs.map(({ className }) => ({
    fileName: `${className}.${ext(lang)}`,
    content: createPageFileContent(className, lang),
  }));
}

export function normalizePageName(pageName) {
  let cleanedName = pageName.trim();

  cleanedName = cleanedName.replace(/page$/i, "");

  const words = cleanedName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  return `${words.join("")}Page`;
}

export function createPageFileContent(className, lang = "js") {
  if (lang === "ts") {
    return `import type { Page } from "@playwright/test";
import BasePage from "./BasePage";

class ${className} extends BasePage {
  constructor(page: Page) {
    super(page);
  }
}

export default ${className};
`;
  }
  return `import BasePage from "./BasePage.js";

class ${className} extends BasePage {
  constructor(page) {
    super(page);
  }
}

export default ${className};
`;
}
