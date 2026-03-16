import fs from "fs";
import path from "path";
import os from "os";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// IMPORTANT: mock Playwright integration so CI never hits the network.
vi.mock("../lib/playwright.js", async () => {
  const actual = await vi.importActual("../lib/playwright.js");
  return {
    ...actual,
    hasPlaywrightInstalled: vi.fn(actual.hasPlaywrightInstalled),
    runPlaywrightInit: vi.fn(() => {}),
    runInstallIfPresent: vi.fn(() => {}),
  };
});

// Avoid hanging on stdin: always resolve prompts immediately.
vi.mock("../lib/helpers.js", async () => {
  const actual = await vi.importActual("../lib/helpers.js");
  return {
    ...actual,
    askQuestion: vi.fn().mockResolvedValue(""),
  };
});

import { runScaffold } from "../lib/scaffold.js";
import {
  hasPlaywrightInstalled,
  runPlaywrightInit,
  runInstallIfPresent,
} from "../lib/playwright.js";

function createTempProjectRoot(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

describe("CLI e2e scaffold with mocked Playwright calls", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scaffolds a JS project from real templates when Playwright is missing", async () => {
    const tmpRoot = createTempProjectRoot("pom-e2e-js-");
    const packageRoot = process.cwd(); // repo root
    const target = path.join(tmpRoot, "project-js-e2e");

    hasPlaywrightInstalled.mockReturnValue(false);

    await runScaffold({
      projectName: "project-js-e2e",
      targetPath: target,
      lang: "js",
      packageRoot,
    });

    // Basic structure exists
    expect(fs.existsSync(path.join(target, "pages", "BasePage.js"))).toBe(true);
    expect(fs.existsSync(path.join(target, "utils", "logger.js"))).toBe(true);
    expect(fs.existsSync(path.join(target, "global-setup.js"))).toBe(true);
    expect(fs.existsSync(path.join(target, "global-teardown.js"))).toBe(true);

    // Playwright integration entrypoints are invoked (but mocked)
    expect(runPlaywrightInit).toHaveBeenCalledWith(target, "js");
    expect(runInstallIfPresent).toHaveBeenCalledWith(target);

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("scaffolds a TS project when Playwright is already installed and skips init", async () => {
    const tmpRoot = createTempProjectRoot("pom-e2e-ts-");
    const packageRoot = process.cwd();
    const target = path.join(tmpRoot, "project-ts-e2e");

    // Simulate existing Playwright TS project: config + tsconfig + deps.
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, "playwright.config.ts"), "// existing config", "utf-8");
    fs.writeFileSync(path.join(target, "tsconfig.json"), "{}", "utf-8");
    fs.writeFileSync(
      path.join(target, "package.json"),
      JSON.stringify({
        devDependencies: {
          "@playwright/test": "1.0.0",
          typescript: "5.0.0",
        },
      }),
      "utf-8",
    );

    hasPlaywrightInstalled.mockReturnValue(true);

    await runScaffold({
      projectName: "project-ts-e2e",
      targetPath: target,
      lang: "ts",
      packageRoot,
    });

    // TS helpers exist
    expect(fs.existsSync(path.join(target, "pages", "BasePage.ts"))).toBe(true);
    expect(fs.existsSync(path.join(target, "utils", "logger.ts"))).toBe(true);
    expect(fs.existsSync(path.join(target, "global-setup.ts"))).toBe(true);
    expect(fs.existsSync(path.join(target, "global-teardown.ts"))).toBe(true);

    // When Playwright is already installed we should skip init
    expect(runPlaywrightInit).not.toHaveBeenCalled();
    expect(runInstallIfPresent).toHaveBeenCalledWith(target);

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });
});

