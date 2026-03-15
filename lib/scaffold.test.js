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
});

