import fs from "fs";
import path from "path";
import os from "os";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./playwright.js", () => ({
  hasPlaywrightInstalled: vi.fn(),
  runPlaywrightInit: vi.fn(),
}));

vi.mock("./helpers.js", async () => {
  const actual = await vi.importActual("./helpers.js");
  return {
    ...actual,
    askQuestion: vi.fn(),
  };
});

import { handleCustomPages, runScaffold } from "./scaffold.js";
import { askQuestion } from "./helpers.js";
import { hasPlaywrightInstalled, runPlaywrightInit } from "./playwright.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("handleCustomPages", () => {
  it("logs done and returns when user skips pages", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-pages-skip-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });

    askQuestion.mockResolvedValueOnce("");

    await handleCustomPages(tmp, "js");

    // No extra files should be created inside pages directory
    const pagesEntries = fs.readdirSync(path.join(tmp, "pages"));
    expect(pagesEntries).toHaveLength(0);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("creates pages for valid inputs and skips invalid ones", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-pages-add-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });

    // dashboard and checkout are valid, invalid.js should be skipped
    askQuestion.mockResolvedValueOnce("dashboard invalid.js checkout");

    await handleCustomPages(tmp, "js");

    const pagesDir = path.join(tmp, "pages");
    const entries = fs.readdirSync(pagesDir);

    expect(entries).toEqual(
      expect.arrayContaining(["DashboardPage.js", "CheckoutPage.js"])
    );

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("runScaffold", () => {
  it("copies templates, creates utility folders, writes JS helpers, and runs Playwright init when missing", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-js-root-"));
    const templatesJs = path.join(tmpRoot, "templates", "js");
    fs.mkdirSync(templatesJs, { recursive: true });
    fs.writeFileSync(path.join(templatesJs, "BasePage.js"), "", "utf-8");

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

  it("writes TS helpers and skips Playwright init when already installed", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pom-scaffold-ts-root-"));
    const templatesTs = path.join(tmpRoot, "templates", "ts");
    fs.mkdirSync(templatesTs, { recursive: true });
    fs.writeFileSync(path.join(templatesTs, "BasePage.ts"), "", "utf-8");

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

