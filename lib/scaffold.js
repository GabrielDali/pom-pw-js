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
  const pkgPath = path.join(targetPath, "package.json");

  // Capture the user's pre-existing package.json (if any) BEFORE we touch the
  // directory. When installing into an existing project, their package.json is
  // authoritative — we must augment it, never regenerate or delete it.
  let originalPkg = null;
  if (fs.existsSync(pkgPath)) {
    try {
      originalPkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    } catch {
      // Malformed file: treat as a fresh project and write template defaults.
    }
  }
  const isExistingProject = originalPkg !== null;

  fs.mkdirSync(targetPath, { recursive: true });
  copyDirectory(templatesPath, targetPath);

  // copyDirectory may have copied templates/<lang>/package.json on top of the
  // target. For an existing project, restore the user's original file. For a
  // brand-new project, remove the template copy: it has no project name and
  // makes Playwright's init skip `npm init -y`, so the correct package.json is
  // written later from lib/package-template.json.
  if (isExistingProject) {
    fs.writeFileSync(pkgPath, JSON.stringify(originalPkg, null, 2) + "\n", "utf-8");
  } else if (fs.existsSync(pkgPath)) {
    fs.rmSync(pkgPath);
  }

  for (const dir of ["utils", "fixtures", "constants", "states"]) {
    fs.mkdirSync(path.join(targetPath, dir), { recursive: true });
  }
  fs.mkdirSync(path.join(targetPath, "utils", "auth"), { recursive: true });

  const utilsDir = path.join(targetPath, "utils");
  const loggerContent = "// add your logger logic here\n";
  const loggerFile = lang === "ts" ? "logger.ts" : "logger.js";
  const loggerCandidates = ["logger.js", "logger.ts", "Logger.js", "Logger.ts"];
  const hasExistingLogger = loggerCandidates.some((file) => fs.existsSync(path.join(utilsDir, file)));
  if (!hasExistingLogger) {
    fs.writeFileSync(path.join(utilsDir, loggerFile), loggerContent, "utf-8");
  }

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

  await handleCustomPages(path.join(targetPath, "pages"), lang);

  if (!hasPlaywrightInstalled(targetPath)) {
    runPlaywrightInit(targetPath, lang);
  }

  // Read whatever is on disk now — Playwright's init may have created or
  // updated package.json (e.g. adding @playwright/test to devDependencies).
  let currentPkg = null;
  if (fs.existsSync(pkgPath)) {
    try {
      currentPkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    } catch {
      // ignore
    }
  }

  if (isExistingProject) {
    // Existing project: keep the user's package.json verbatim and only merge in
    // the devDependencies Playwright installed. Their name, type, version,
    // scripts, and any custom fields are left untouched.
    const merged = { ...originalPkg };
    const installedDevDeps = currentPkg?.devDependencies ?? {};
    if (Object.keys(installedDevDeps).length > 0) {
      merged.devDependencies = { ...originalPkg.devDependencies, ...installedDevDeps };
    }
    fs.writeFileSync(pkgPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");

    if (lang === "js" && originalPkg.type !== "module") {
      console.warn(
        "Warning: the generated global-setup.js/global-teardown.js use ES module syntax, " +
          'but this project is not "type": "module". Set "type": "module" in package.json ' +
          "or convert those files to CommonJS for them to run."
      );
    }
  } else {
    // New project: normalize package.json to our template defaults.
    const templatePkgPath = path.join(packageRoot, "lib", "package-template.json");
    const templatePkg = JSON.parse(fs.readFileSync(templatePkgPath, "utf-8"));
    templatePkg.name = projectName;
    templatePkg.devDependencies = currentPkg?.devDependencies ?? templatePkg.devDependencies ?? {};
    if (currentPkg?.scripts && Object.keys(currentPkg.scripts).length > 0) {
      templatePkg.scripts = currentPkg.scripts;
    }
    if (currentPkg?.dependencies && Object.keys(currentPkg.dependencies).length > 0) {
      templatePkg.dependencies = currentPkg.dependencies;
    }
    fs.writeFileSync(pkgPath, JSON.stringify(templatePkg, null, 2) + "\n", "utf-8");
  }

  runInstallIfPresent(targetPath);
}
