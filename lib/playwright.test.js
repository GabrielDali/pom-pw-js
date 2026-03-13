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
});

describe("detectPlaywrightLang error handling", () => {
  it("returns null when package.json is malformed JSON", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-detect-badjson-"));
    fs.writeFileSync(path.join(tmp, "package.json"), "{not-json", "utf-8");

    expect(detectPlaywrightLang(tmp)).toBeNull();

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

