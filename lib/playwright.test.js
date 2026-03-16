import fs from "fs";
import path from "path";
import os from "os";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("child_process", () => ({
  spawnSync: vi.fn(),
}));

import {
  hasPlaywrightInstalled,
  detectPlaywrightLang,
  detectLangFromPagesDir,
  runPlaywrightInit,
  runInstallIfPresent,
} from "./playwright.js";
import { spawnSync } from "child_process";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hasPlaywrightInstalled error handling", () => {
  it("returns false when package.json is malformed JSON", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-playwright-badjson-"));
    fs.writeFileSync(path.join(tmp, "package.json"), "{not-json", "utf-8");

    expect(hasPlaywrightInstalled(tmp)).toBe(false);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns true when playwright is in dependencies (not devDependencies)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-playwright-deps-"));
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ dependencies: { playwright: "1.0.0" } }),
      "utf-8",
    );

    expect(hasPlaywrightInstalled(tmp)).toBe(true);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("detectLangFromPagesDir", () => {
  it('returns "ts" when any .ts file exists in pagesDir', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-pages-lang-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "pages", "BasePage.ts"), "", "utf-8");

    expect(detectLangFromPagesDir(path.join(tmp, "pages"))).toBe("ts");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns "js" when only .js files exist', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-pages-lang-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "pages", "BasePage.js"), "", "utf-8");

    expect(detectLangFromPagesDir(path.join(tmp, "pages"))).toBe("js");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns "ts" when both .ts and .js exist (ts preferred)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-pages-lang-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "pages", "BasePage.js"), "", "utf-8");
    fs.writeFileSync(path.join(tmp, "pages", "DashboardPage.ts"), "", "utf-8");

    expect(detectLangFromPagesDir(path.join(tmp, "pages"))).toBe("ts");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns null when directory is empty", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-pages-lang-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });

    expect(detectLangFromPagesDir(path.join(tmp, "pages"))).toBeNull();

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns null when directory does not exist", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-pages-lang-"));

    expect(detectLangFromPagesDir(path.join(tmp, "pages"))).toBeNull();

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("detectPlaywrightLang error handling", () => {
  it("returns null when package.json is malformed JSON", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-detect-badjson-"));
    fs.writeFileSync(path.join(tmp, "package.json"), "{not-json", "utf-8");

    expect(detectPlaywrightLang(tmp)).toBeNull();

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("detectPlaywrightLang config detection", () => {
  it('returns "ts" when a TypeScript Playwright config exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-detect-tsconfig-"));
    fs.writeFileSync(path.join(tmp, "playwright.config.ts"), "// ts config", "utf-8");

    expect(detectPlaywrightLang(tmp)).toBe("ts");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns "ts" when playwright.config.mts exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-detect-mtsconfig-"));
    fs.writeFileSync(path.join(tmp, "playwright.config.mts"), "// ts config", "utf-8");

    expect(detectPlaywrightLang(tmp)).toBe("ts");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns "js" when only a JavaScript Playwright config exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-detect-jsconfig-"));
    fs.writeFileSync(path.join(tmp, "playwright.config.mjs"), "// js config", "utf-8");

    expect(detectPlaywrightLang(tmp)).toBe("js");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns "ts" when tsconfig.json exists and no JS Playwright config is present', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-detect-tsconfigonly-"));
    fs.writeFileSync(path.join(tmp, "tsconfig.json"), "{}", "utf-8");

    expect(detectPlaywrightLang(tmp)).toBe("ts");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns "ts" when both playwright.config.ts and playwright.config.js exist', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-detect-bothconfigs-"));
    fs.writeFileSync(path.join(tmp, "playwright.config.ts"), "// ts config", "utf-8");
    fs.writeFileSync(path.join(tmp, "playwright.config.js"), "// js config", "utf-8");

    expect(detectPlaywrightLang(tmp)).toBe("ts");

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("runPlaywrightInit", () => {
  it("spawns npm init playwright with correct options and does not warn on success", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-init-ok-"));
    spawnSync.mockReturnValueOnce({ status: 0 });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    runPlaywrightInit(tmp, "js");

    expect(spawnSync).toHaveBeenCalledWith(
      "npm",
      ["init", "playwright@latest", "--", "--quiet", "--lang=js"],
      expect.objectContaining({
        cwd: tmp,
        stdio: "inherit",
        shell: true,
      }),
    );
    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("logs a warning when Playwright init exits with non-zero status", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-init-fail-"));
    spawnSync.mockReturnValueOnce({ status: 1 });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    runPlaywrightInit(tmp, "ts");

    expect(warnSpy).toHaveBeenCalledWith(
      "Playwright init failed; run npm init playwright@latest in the project folder.",
    );

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("runInstallIfPresent", () => {
  it("does nothing when package.json is missing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-install-missing-"));

    runInstallIfPresent(tmp);

    expect(spawnSync).not.toHaveBeenCalled();

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("runs npm install when package.json exists", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-install-ok-"));
    fs.writeFileSync(path.join(tmp, "package.json"), "{}", "utf-8");

    spawnSync.mockReturnValueOnce({ status: 0 });

    runInstallIfPresent(tmp);

    expect(spawnSync).toHaveBeenCalledWith(
      "npm",
      ["install"],
      expect.objectContaining({
        cwd: tmp,
        stdio: "inherit",
        shell: true,
      }),
    );

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

