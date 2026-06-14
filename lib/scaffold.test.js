import fs from "fs";
import path from "path";
import os from "os";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./playwright.js", async () => {
  const actual = await vi.importActual("./playwright.js");
  return {
    ...actual,
    hasPlaywrightInstalled: vi.fn(),
    runPlaywrightInit: vi.fn(),
    detectPlaywrightLang: vi.fn(),
  };
});

vi.mock("./helpers.js", async () => {
  const actual = await vi.importActual("./helpers.js");
  return {
    ...actual,
    askQuestion: vi.fn(),
  };
});

vi.mock("./prompt.js", () => ({
  askLanguage: vi.fn(),
}));

import { handleCustomPages, runScaffold, runAddPages } from "./scaffold.js";
import { askQuestion } from "./helpers.js";
import { hasPlaywrightInstalled, runPlaywrightInit, detectPlaywrightLang } from "./playwright.js";
import { askLanguage } from "./prompt.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("handleCustomPages", () => {
  it("logs done and returns when user skips pages", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-pages-skip-"));
    const pagesDir = path.join(tmp, "pages");
    fs.mkdirSync(pagesDir, { recursive: true });

    askQuestion.mockResolvedValueOnce("");

    await handleCustomPages(pagesDir, "js");

    // No extra files should be created inside pages directory
    const pagesEntries = fs.readdirSync(pagesDir);
    expect(pagesEntries).toHaveLength(0);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("creates pages for valid inputs and skips invalid ones", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-pages-add-"));
    const pagesDir = path.join(tmp, "pages");
    fs.mkdirSync(pagesDir, { recursive: true });

    // dashboard and checkout are valid, invalid.js should be skipped
    askQuestion.mockResolvedValueOnce("dashboard invalid.js checkout");

    await handleCustomPages(pagesDir, "js");

    const entries = fs.readdirSync(pagesDir);

    expect(entries).toEqual(
      expect.arrayContaining(["DashboardPage.js", "CheckoutPage.js"])
    );

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("creates pages directory when it does not exist (e.g. was deleted)", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-pages-missing-dir-"));
    const pagesDir = path.join(tmp, "pages");

    askQuestion.mockResolvedValueOnce("checkout");

    await handleCustomPages(pagesDir, "js");

    expect(fs.existsSync(pagesDir)).toBe(true);
    expect(fs.existsSync(path.join(pagesDir, "CheckoutPage.js"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("runAddPages", () => {
  it("when no pages folder exists: creates pages folder, re-adds BasePage, and adds user pages", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-add-pages-no-folder-"));
    detectPlaywrightLang.mockReturnValue("js");
    askQuestion.mockResolvedValueOnce("tesv hs");

    const result = await runAddPages(tmp);

    expect(result).toBe(true);
    const pagesDir = path.join(tmp, "pages");
    expect(fs.existsSync(pagesDir)).toBe(true);
    expect(fs.existsSync(path.join(pagesDir, "BasePage.js"))).toBe(true);
    expect(fs.existsSync(path.join(pagesDir, "TesvPage.js"))).toBe(true);
    expect(fs.existsSync(path.join(pagesDir, "HsPage.js"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("when no pages folder exists with TS: creates pages folder and BasePage.ts", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-add-pages-no-folder-ts-"));
    detectPlaywrightLang.mockReturnValue("ts");
    askQuestion.mockResolvedValueOnce("dashboard");

    const result = await runAddPages(tmp);

    expect(result).toBe(true);
    expect(fs.existsSync(path.join(tmp, "pages", "BasePage.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "pages", "DashboardPage.ts"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("finds lowercase pages folder, detects js lang, creates pages", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-add-pages-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });
    detectPlaywrightLang.mockReturnValue("js");
    askQuestion.mockResolvedValueOnce("dashboard");

    const result = await runAddPages(tmp);

    expect(result).toBe(true);
    expect(fs.existsSync(path.join(tmp, "pages", "DashboardPage.js"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("finds PascalCase Pages folder and creates .ts pages", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-add-pages-ts-"));
    fs.mkdirSync(path.join(tmp, "Pages"), { recursive: true });
    detectPlaywrightLang.mockReturnValue("ts");
    askQuestion.mockResolvedValueOnce("checkout");

    const result = await runAddPages(tmp);

    expect(result).toBe(true);
    expect(fs.existsSync(path.join(tmp, "Pages", "CheckoutPage.ts"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("falls back to askLanguage when language cannot be detected", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-add-pages-lang-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });
    detectPlaywrightLang.mockReturnValue(null);
    askLanguage.mockResolvedValueOnce("js");
    askQuestion.mockResolvedValueOnce("payment");

    const result = await runAddPages(tmp);

    expect(result).toBe(true);
    expect(askLanguage).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(tmp, "pages", "PaymentPage.js"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("skips creating a page that already exists", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-add-pages-dup-"));
    const pagesDir = path.join(tmp, "pages");
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.writeFileSync(path.join(pagesDir, "DashboardPage.js"), "existing", "utf-8");
    detectPlaywrightLang.mockReturnValue("js");
    askQuestion.mockResolvedValueOnce("dashboard");

    await runAddPages(tmp);

    // File should remain unchanged
    expect(fs.readFileSync(path.join(pagesDir, "DashboardPage.js"), "utf-8")).toBe("existing");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("when pages folder has only .ts files: uses TS without prompting, new pages are .ts", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-add-pages-lock-ts-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "pages", "BasePage.ts"), "", "utf-8");
    askQuestion.mockResolvedValueOnce("checkout");

    const result = await runAddPages(tmp);

    expect(result).toBe(true);
    expect(askLanguage).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(tmp, "pages", "CheckoutPage.ts"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("when pages folder has only .js files: uses JS without prompting, new pages are .js", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-add-pages-lock-js-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "pages", "BasePage.js"), "", "utf-8");
    askQuestion.mockResolvedValueOnce("payment");

    const result = await runAddPages(tmp);

    expect(result).toBe(true);
    expect(askLanguage).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(tmp, "pages", "PaymentPage.js"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("when pages folder exists but is empty and no project lang: still prompts for language", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-add-pages-empty-pages-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });
    detectPlaywrightLang.mockReturnValue(null);
    askLanguage.mockResolvedValueOnce("js");
    askQuestion.mockResolvedValueOnce("dashboard");

    const result = await runAddPages(tmp);

    expect(result).toBe(true);
    expect(askLanguage).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(tmp, "pages", "DashboardPage.js"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("runScaffold", () => {
  const minimalTemplatePkg = {
    name: "{{PROJECT_NAME}}",
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

  const libPackageTemplate = {
    name: "",
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

  function writeLibPackageTemplate(tmpRoot) {
    const libDir = path.join(tmpRoot, "lib");
    fs.mkdirSync(libDir, { recursive: true });
    fs.writeFileSync(path.join(libDir, "package-template.json"), JSON.stringify(libPackageTemplate, null, 2), "utf-8");
  }

  it("copies templates, creates utility folders, writes JS helpers, and runs Playwright init when missing", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-js-root-"));
    writeLibPackageTemplate(tmpRoot);
    const templatesJs = path.join(tmpRoot, "templates", "js");
    fs.mkdirSync(templatesJs, { recursive: true });
    fs.writeFileSync(path.join(templatesJs, "BasePage.js"), "", "utf-8");
    fs.writeFileSync(path.join(templatesJs, "package.json"), JSON.stringify(minimalTemplatePkg, null, 2), "utf-8");

    const target = path.join(tmpRoot, "project-js");

    // No playwright installed → should call runPlaywrightInit
    hasPlaywrightInstalled.mockReturnValue(false);
    askQuestion.mockResolvedValueOnce("");

    await runScaffold({
      projectName: "project-js",
      targetPath: target,
      lang: "js",
      packageRoot: tmpRoot,
    });

    // Directories created
    ["utils", "fixtures", "constants", "states"].forEach((d) => {
      expect(fs.existsSync(path.join(target, d))).toBe(true);
    });
    expect(fs.existsSync(path.join(target, "utils", "auth"))).toBe(true);

    // Logger and global setup/teardown files created for JS
    expect(fs.existsSync(path.join(target, "utils", "logger.js"))).toBe(true);
    expect(fs.existsSync(path.join(target, "global-setup.js"))).toBe(true);
    expect(fs.existsSync(path.join(target, "global-teardown.js"))).toBe(true);

    // .gitignore should contain states (covered via ensureStatesInGitignore)
    const gitignore = fs.readFileSync(path.join(target, ".gitignore"), "utf-8");
    expect(gitignore).toContain("states");

    // Playwright init should be invoked
    expect(runPlaywrightInit).toHaveBeenCalledWith(target, "js");

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("after Playwright init, patches package.json with name, version, main, type, and does not create index.js", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-pkg-patch-"));
    writeLibPackageTemplate(tmpRoot);
    const templatesJs = path.join(tmpRoot, "templates", "js");
    fs.mkdirSync(templatesJs, { recursive: true });
    fs.writeFileSync(path.join(templatesJs, "BasePage.js"), "", "utf-8");
    fs.writeFileSync(path.join(templatesJs, "package.json"), JSON.stringify(minimalTemplatePkg, null, 2), "utf-8");
    const target = path.join(tmpRoot, "my-app");

    hasPlaywrightInstalled.mockReturnValue(false);
    runPlaywrightInit.mockImplementation((targetPath) => {
      fs.writeFileSync(
        path.join(targetPath, "package.json"),
        JSON.stringify({
          main: "global-setup.js",
          devDependencies: { "@playwright/test": "^1.58.2", "@types/node": "^25.5.0" },
        }),
        "utf-8",
      );
    });
    askQuestion.mockResolvedValueOnce("");

    await runScaffold({
      projectName: "my-app",
      targetPath: target,
      lang: "js",
      packageRoot: tmpRoot,
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf-8"));
    expect(pkg.name).toBe("my-app");
    expect(pkg.version).toBe("1.0.0");
    expect(pkg.main).toBe("index.js");
    expect(pkg.type).toBe("module");
    expect(pkg.scripts).toEqual({});
    expect(pkg.keywords).toEqual([]);
    expect(pkg.author).toBe("");
    expect(pkg.license).toBe("ISC");
    expect(pkg.description).toBe("");
    expect(pkg.devDependencies).toEqual({ "@playwright/test": "^1.58.2", "@types/node": "^25.5.0" });
    expect(fs.existsSync(path.join(target, "index.js"))).toBe(false);

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("after Playwright init, preserves non-empty scripts when patching package.json", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-pkg-scripts-"));
    writeLibPackageTemplate(tmpRoot);
    const templatesJs = path.join(tmpRoot, "templates", "js");
    fs.mkdirSync(templatesJs, { recursive: true });
    fs.writeFileSync(path.join(templatesJs, "BasePage.js"), "", "utf-8");
    fs.writeFileSync(path.join(templatesJs, "package.json"), JSON.stringify(minimalTemplatePkg, null, 2), "utf-8");
    const target = path.join(tmpRoot, "proj");

    hasPlaywrightInstalled.mockReturnValue(false);
    runPlaywrightInit.mockImplementation((targetPath) => {
      fs.writeFileSync(
        path.join(targetPath, "package.json"),
        JSON.stringify({
          scripts: { "test": "playwright test", "build": "tsc" },
          devDependencies: { "@playwright/test": "^1.58.2" },
        }),
        "utf-8",
      );
    });
    askQuestion.mockResolvedValueOnce("");

    await runScaffold({
      projectName: "proj",
      targetPath: target,
      lang: "js",
      packageRoot: tmpRoot,
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf-8"));
    expect(pkg.scripts).toEqual({ "test": "playwright test", "build": "tsc" });

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("after Playwright init, preserves existing dependencies when patching package.json", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-pkg-deps-"));
    writeLibPackageTemplate(tmpRoot);
    const templatesJs = path.join(tmpRoot, "templates", "js");
    fs.mkdirSync(templatesJs, { recursive: true });
    fs.writeFileSync(path.join(templatesJs, "BasePage.js"), "", "utf-8");
    fs.writeFileSync(path.join(templatesJs, "package.json"), JSON.stringify(minimalTemplatePkg, null, 2), "utf-8");
    const target = path.join(tmpRoot, "proj");

    hasPlaywrightInstalled.mockReturnValue(false);
    runPlaywrightInit.mockImplementation((targetPath) => {
      fs.writeFileSync(
        path.join(targetPath, "package.json"),
        JSON.stringify({
          dependencies: { "playwright-pom": "file:../playwright-pom-1.0.1.tgz" },
          devDependencies: { "@playwright/test": "^1.58.2" },
        }),
        "utf-8",
      );
    });
    askQuestion.mockResolvedValueOnce("");

    await runScaffold({
      projectName: "proj",
      targetPath: target,
      lang: "js",
      packageRoot: tmpRoot,
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf-8"));
    expect(pkg.dependencies).toEqual({ "playwright-pom": "file:../playwright-pom-1.0.1.tgz" });
    expect(pkg.devDependencies).toEqual({ "@playwright/test": "^1.58.2" });

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("after Playwright init, does not throw when package.json is malformed", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-pkg-bad-"));
    writeLibPackageTemplate(tmpRoot);
    const templatesJs = path.join(tmpRoot, "templates", "js");
    fs.mkdirSync(templatesJs, { recursive: true });
    fs.writeFileSync(path.join(templatesJs, "BasePage.js"), "", "utf-8");
    fs.writeFileSync(path.join(templatesJs, "package.json"), JSON.stringify(minimalTemplatePkg, null, 2), "utf-8");
    const target = path.join(tmpRoot, "proj");

    hasPlaywrightInstalled.mockReturnValue(false);
    runPlaywrightInit.mockImplementation((targetPath) => {
      fs.writeFileSync(path.join(targetPath, "package.json"), "{ invalid", "utf-8");
    });
    askQuestion.mockResolvedValueOnce("");

    await expect(
      runScaffold({
        projectName: "proj",
        targetPath: target,
        lang: "js",
        packageRoot: tmpRoot,
      }),
    ).resolves.toBeUndefined();

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("writes TS helpers and skips Playwright init when already installed", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-ts-root-"));
    writeLibPackageTemplate(tmpRoot);
    const templatesTs = path.join(tmpRoot, "templates", "ts");
    fs.mkdirSync(templatesTs, { recursive: true });
    fs.writeFileSync(path.join(templatesTs, "BasePage.ts"), "", "utf-8");
    fs.writeFileSync(path.join(templatesTs, "package.json"), JSON.stringify(minimalTemplatePkg, null, 2), "utf-8");

    const target = path.join(tmpRoot, "project-ts");

    hasPlaywrightInstalled.mockReturnValue(true);
    askQuestion.mockResolvedValueOnce("");

    await runScaffold({
      projectName: "project-ts",
      targetPath: target,
      lang: "ts",
      packageRoot: tmpRoot,
    });

    // Logger and global setup/teardown files created for TS
    expect(fs.existsSync(path.join(target, "utils", "logger.ts"))).toBe(true);
    expect(fs.existsSync(path.join(target, "global-setup.ts"))).toBe(true);
    expect(fs.existsSync(path.join(target, "global-teardown.ts"))).toBe(true);

    // When Playwright is already installed, init should not run
    expect(runPlaywrightInit).not.toHaveBeenCalled();

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("does not overwrite existing utils/logger.js when scaffolding JS", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-keep-logger-js-"));
    writeLibPackageTemplate(tmpRoot);
    const templatesJs = path.join(tmpRoot, "templates", "js");
    fs.mkdirSync(templatesJs, { recursive: true });
    fs.writeFileSync(path.join(templatesJs, "BasePage.js"), "", "utf-8");
    fs.writeFileSync(path.join(templatesJs, "package.json"), JSON.stringify(minimalTemplatePkg, null, 2), "utf-8");
    const target = path.join(tmpRoot, "project-js");
    const utilsDir = path.join(target, "utils");
    fs.mkdirSync(utilsDir, { recursive: true });
    const original = "export function logger(){ return 'keep-js'; }\n";
    fs.writeFileSync(path.join(utilsDir, "logger.js"), original, "utf-8");

    hasPlaywrightInstalled.mockReturnValue(true);
    askQuestion.mockResolvedValueOnce("");

    await runScaffold({
      projectName: "project-js",
      targetPath: target,
      lang: "js",
      packageRoot: tmpRoot,
    });

    expect(fs.readFileSync(path.join(utilsDir, "logger.js"), "utf-8")).toBe(original);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("does not overwrite existing utils/Logger.ts when scaffolding TS", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-keep-logger-ts-"));
    writeLibPackageTemplate(tmpRoot);
    const templatesTs = path.join(tmpRoot, "templates", "ts");
    fs.mkdirSync(templatesTs, { recursive: true });
    fs.writeFileSync(path.join(templatesTs, "BasePage.ts"), "", "utf-8");
    fs.writeFileSync(path.join(templatesTs, "package.json"), JSON.stringify(minimalTemplatePkg, null, 2), "utf-8");
    const target = path.join(tmpRoot, "project-ts");
    const utilsDir = path.join(target, "utils");
    fs.mkdirSync(utilsDir, { recursive: true });
    const original = "export const Logger = { info: () => 'keep-ts' };\n";
    fs.writeFileSync(path.join(utilsDir, "Logger.ts"), original, "utf-8");

    hasPlaywrightInstalled.mockReturnValue(true);
    askQuestion.mockResolvedValueOnce("");

    await runScaffold({
      projectName: "project-ts",
      targetPath: target,
      lang: "ts",
      packageRoot: tmpRoot,
    });

    expect(fs.readFileSync(path.join(utilsDir, "Logger.ts"), "utf-8")).toBe(original);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("installing into an existing JS project preserves package.json (type, scripts, version, custom fields) and only adds devDeps", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-existing-js-"));
    writeLibPackageTemplate(tmpRoot);
    const templatesJs = path.join(tmpRoot, "templates", "js");
    fs.mkdirSync(templatesJs, { recursive: true });
    fs.writeFileSync(path.join(templatesJs, "BasePage.js"), "", "utf-8");
    fs.writeFileSync(path.join(templatesJs, "package.json"), JSON.stringify(minimalTemplatePkg, null, 2), "utf-8");

    // The user's existing project (targetPath === their repo root).
    const target = tmpRoot;
    const userPkg = {
      name: "my-real-app",
      version: "3.2.1",
      description: "An existing production app",
      type: "commonjs",
      private: true,
      main: "src/server.js",
      engines: { node: ">=20" },
      scripts: { dev: "nodemon src/server.js", build: "webpack" },
      dependencies: { express: "^4.19.0" },
      devDependencies: { nodemon: "^3.0.0" },
      workspaces: ["packages/*"],
    };
    fs.writeFileSync(path.join(target, "package.json"), JSON.stringify(userPkg, null, 2), "utf-8");

    // Playwright not yet installed → init runs and adds @playwright/test, like create-playwright.
    hasPlaywrightInstalled.mockReturnValue(false);
    runPlaywrightInit.mockImplementation((targetPath) => {
      const pkg = JSON.parse(fs.readFileSync(path.join(targetPath, "package.json"), "utf-8"));
      pkg.devDependencies = { ...pkg.devDependencies, "@playwright/test": "^1.58.2" };
      fs.writeFileSync(path.join(targetPath, "package.json"), JSON.stringify(pkg), "utf-8");
    });
    askQuestion.mockResolvedValueOnce("");

    await runScaffold({
      projectName: "my-real-app",
      targetPath: target,
      lang: "js",
      packageRoot: tmpRoot,
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf-8"));
    // Identity and custom fields untouched.
    expect(pkg.name).toBe("my-real-app");
    expect(pkg.version).toBe("3.2.1");
    expect(pkg.description).toBe("An existing production app");
    expect(pkg.type).toBe("commonjs");
    expect(pkg.private).toBe(true);
    expect(pkg.main).toBe("src/server.js");
    expect(pkg.engines).toEqual({ node: ">=20" });
    expect(pkg.workspaces).toEqual(["packages/*"]);
    // Scripts preserved exactly.
    expect(pkg.scripts).toEqual({ dev: "nodemon src/server.js", build: "webpack" });
    // Dependencies preserved.
    expect(pkg.dependencies).toEqual({ express: "^4.19.0" });
    // Playwright devDep merged in alongside the user's.
    expect(pkg.devDependencies).toEqual({ nodemon: "^3.0.0", "@playwright/test": "^1.58.2" });

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("installing into an existing TS project does not let templates/ts/package.json clobber the user's", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-existing-ts-"));
    writeLibPackageTemplate(tmpRoot);
    const templatesTs = path.join(tmpRoot, "templates", "ts");
    fs.mkdirSync(templatesTs, { recursive: true });
    fs.writeFileSync(path.join(templatesTs, "BasePage.ts"), "", "utf-8");
    // The template ships a package.json that copyDirectory would copy over the user's.
    fs.writeFileSync(path.join(templatesTs, "package.json"), JSON.stringify(minimalTemplatePkg, null, 2), "utf-8");

    const target = tmpRoot;
    const userPkg = {
      name: "existing-ts-app",
      version: "2.0.0",
      scripts: { test: "vitest run" },
      devDependencies: { "@playwright/test": "^1.50.0", typescript: "^5.0.0" },
    };
    fs.writeFileSync(path.join(target, "package.json"), JSON.stringify(userPkg, null, 2), "utf-8");

    // Playwright already present → init is skipped.
    hasPlaywrightInstalled.mockReturnValue(true);
    askQuestion.mockResolvedValueOnce("");

    await runScaffold({
      projectName: "existing-ts-app",
      targetPath: target,
      lang: "ts",
      packageRoot: tmpRoot,
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf-8"));
    expect(pkg.name).toBe("existing-ts-app");
    expect(pkg.version).toBe("2.0.0");
    expect(pkg.scripts).toEqual({ test: "vitest run" });
    expect(pkg.devDependencies).toEqual({ "@playwright/test": "^1.50.0", typescript: "^5.0.0" });
    // No template leakage.
    expect(pkg.license).not.toBe("ISC");
    expect(runPlaywrightInit).not.toHaveBeenCalled();

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });
});

