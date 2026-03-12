import fs from "fs";
import path from "path";
import {
  askQuestion,
  copyDirectory,
  parsePageInputs,
  getUniquePageFileNames,
  getPageContentsToWrite,
  isInvalidPageInput,
} from "./helpers.js";
import { ensureStatesInGitignore } from "./gitignore.js";
import { hasPlaywrightInstalled, runPlaywrightInit } from "./playwright.js";

export function isAlreadyScaffolded(targetPath) {
  const baseJs = path.join(targetPath, "pages", "BasePage.js");
  const baseTs = path.join(targetPath, "pages", "BasePage.ts");
  return fs.existsSync(baseJs) || fs.existsSync(baseTs);
}

export const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
`;

const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

export async function handleCustomPages(targetPath, lang) {
  const pagesInput = await askQuestion(
    `${GREEN}Would you like to add any pages? Type names separated by spaces (e.g. dashboard payment checkout), or press Enter to skip:${RESET} `
  );

  const rawPageNames = parsePageInputs(pagesInput);
  if (rawPageNames.length === 0) {
    console.log(`${GREEN}Pages step done.${RESET}`);
    return;
  }

  for (const raw of rawPageNames) {
    if (isInvalidPageInput(raw)) console.log(`Invalid page input skipped: ${raw}`);
  }
  const specs = getUniquePageFileNames(rawPageNames, lang);
  const pagesDir = path.join(targetPath, "pages");

  for (const { fileName, content } of getPageContentsToWrite(specs, lang)) {
    const filePath = path.join(pagesDir, fileName);
    if (fs.existsSync(filePath)) {
      console.log(`Page already exists, skipped: ${fileName}`);
      continue;
    }
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`Created page: ${fileName}`);
  }
  console.log(`${GREEN}All pages added.${RESET}`);
}

export async function runScaffold({ projectName, targetPath, lang, packageRoot }) {
  const templatesPath = path.join(packageRoot, "templates", lang);

  fs.mkdirSync(targetPath, { recursive: true });
  copyDirectory(templatesPath, targetPath);

  for (const dir of ["utils", "fixtures", "constants", "states"]) {
    fs.mkdirSync(path.join(targetPath, dir), { recursive: true });
  }
  fs.mkdirSync(path.join(targetPath, "utils", "auth"), { recursive: true });

  const loggerContent = "// add your logger logic here\n";
  const loggerFile = lang === "ts" ? "logger.ts" : "logger.js";
  fs.writeFileSync(path.join(targetPath, "utils", loggerFile), loggerContent, "utf-8");

  const globalSetupContent =
    lang === "ts"
      ? "export default async function globalSetup(): Promise<void> {\n  // add your global setup functionality here\n}\n"
      : "export default async function globalSetup() {\n  // add your global setup functionality here\n}\n";
  const globalSetupFile = lang === "ts" ? "global-setup.ts" : "global-setup.js";
  fs.writeFileSync(path.join(targetPath, globalSetupFile), globalSetupContent, "utf-8");

  const globalTeardownContent =
    lang === "ts"
      ? "export default async function globalTeardown(): Promise<void> {\n  // add your global teardown functionality here\n}\n"
      : "export default async function globalTeardown() {\n  // add your global teardown functionality here\n}\n";
  const globalTeardownFile = lang === "ts" ? "global-teardown.ts" : "global-teardown.js";
  fs.writeFileSync(path.join(targetPath, globalTeardownFile), globalTeardownContent, "utf-8");

  ensureStatesInGitignore(targetPath);

  console.log(`Creating project: ${projectName} (${lang === "ts" ? "TypeScript" : "JavaScript"})`);
  console.log(`Project folder created at: ${targetPath}`);
  console.log("Template files copied successfully");

  await handleCustomPages(targetPath, lang);

  if (!hasPlaywrightInstalled(targetPath)) {
    runPlaywrightInit(targetPath, lang);
  }
}
