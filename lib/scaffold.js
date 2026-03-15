import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  askQuestion,
  copyDirectory,
  parsePageInputs,
  getUniquePageFileNames,
  getPageContentsToWrite,
  isInvalidPageInput,
  findPagesFolder,
} from "./helpers.js";
import { ensureStatesInGitignore } from "./gitignore.js";
import { hasPlaywrightInstalled, runPlaywrightInit, runInstallIfPresent, detectPlaywrightLang, detectLangFromPagesDir } from "./playwright.js";
import { askLanguage } from "./prompt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(__dirname, "..");

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

export async function handleCustomPages(pagesDir, lang) {
  fs.mkdirSync(pagesDir, { recursive: true });

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

function copyBasePageToPagesDir(pagesDir, lang) {
  const ext = lang === "ts" ? "ts" : "js";
  const baseFileName = `BasePage.${ext}`;
  const templatePath = path.join(packageRoot, "templates", lang, "pages", baseFileName);
  if (!fs.existsSync(templatePath)) return;
  const content = fs.readFileSync(templatePath, "utf-8");
  fs.writeFileSync(path.join(pagesDir, baseFileName), content, "utf-8");
}

export async function runAddPages(cwd) {
  let pagesDir = findPagesFolder(cwd);
  const needSetup = !pagesDir;

  let lang = null;
  if (pagesDir) {
    lang = detectLangFromPagesDir(pagesDir);
    if (lang) {
      console.log(`Using ${lang === "ts" ? "TypeScript" : "JavaScript"} (detected from existing pages).`);
    }
  }
  if (lang == null) {
    lang = detectPlaywrightLang(cwd);
    if (lang) {
      console.log(`Using ${lang === "ts" ? "TypeScript" : "JavaScript"} (detected from project).`);
    }
  }
  if (lang == null) {
    lang = await askLanguage();
  }

  if (needSetup) {
    pagesDir = path.join(cwd, "pages");
    console.log("Creating pages folder.");
    fs.mkdirSync(pagesDir, { recursive: true });
    copyBasePageToPagesDir(pagesDir, lang);
    console.log("Re-added BasePage.");
  }

  await handleCustomPages(pagesDir, lang);
  return true;
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

  function ensurePackageJsonMainAndType(targetPath) {
    const pkgPath = path.join(targetPath, "package.json");
    if (!fs.existsSync(pkgPath)) return;
    try {
      const raw = fs.readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(raw);
      if (typeof pkg !== "object" || pkg === null) return;
      pkg.main = "index.js";
      pkg.type = "module";
      if (pkg.name == null) pkg.name = projectName;
      if (pkg.version == null) pkg.version = "1.0.0";
      if (pkg.scripts == null || typeof pkg.scripts !== "object" || Array.isArray(pkg.scripts)) pkg.scripts = {};
      if (pkg.keywords == null || !Array.isArray(pkg.keywords)) pkg.keywords = [];
      if (pkg.author == null) pkg.author = "";
      if (pkg.license == null) pkg.license = "ISC";
      if (pkg.description == null) pkg.description = "";
      if (pkg.dependencies != null && (typeof pkg.dependencies !== "object" || Array.isArray(pkg.dependencies))) pkg.dependencies = {};
      if (pkg.devDependencies == null || typeof pkg.devDependencies !== "object" || Array.isArray(pkg.devDependencies)) pkg.devDependencies = {};
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    } catch {
      // ignore
    }
  }

  console.log(`Creating project: ${projectName} (${lang === "ts" ? "TypeScript" : "JavaScript"})`);
  console.log(`Project folder created at: ${targetPath}`);
  console.log("Template files copied successfully");

  await handleCustomPages(path.join(targetPath, "pages"), lang);


  const pkgPath = path.join(targetPath, "package.json");
  if (!fs.existsSync(pkgPath)) {
    const minimal = {
      name: projectName,
      version: "1.0.0",
      main: "index.js",
      type: "module",
      scripts: {},
      keywords: [],
      author: "",
      license: "ISC",
      description: "",
      devDependencies: {},
    };
    fs.writeFileSync(pkgPath, JSON.stringify(minimal, null, 2) + "\n", "utf-8");
  } else {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    pkg.main = "index.js";
    pkg.type = "module";
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  }

  if (!hasPlaywrightInstalled(targetPath)) {
    runPlaywrightInit(targetPath, lang);
  }
  runInstallIfPresent(targetPath);
  ensurePackageJsonMainAndType(targetPath);
}
