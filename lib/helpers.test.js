import fs from "fs";
import path from "path";
import os from "os";
import { describe, it, expect } from "vitest";
import {
  isInvalidPageInput,
  normalizePageName,
  createPageFileContent,
  getProjectPath,
  parsePageInputs,
  getUniquePageFileNames,
  getPageContentsToWrite,
  copyDirectory,
} from "./helpers.js";
import { ensureStatesInGitignore } from "./gitignore.js";
import { isAlreadyScaffolded } from "./scaffold.js";
import { detectPlaywrightLang, hasPlaywrightInstalled } from "./playwright.js";

describe("isInvalidPageInput", () => {
  it("returns true for empty or falsy input", () => {
    expect(isInvalidPageInput("")).toBe(true);
    expect(isInvalidPageInput(null)).toBe(true);
    expect(isInvalidPageInput(undefined)).toBe(true);
  });

  it("returns true when input contains .js", () => {
    expect(isInvalidPageInput("Dashboard.js")).toBe(true);
    expect(isInvalidPageInput("page.js")).toBe(true);
  });

  it("returns true when input has non-letter characters", () => {
    expect(isInvalidPageInput("dashboard2")).toBe(true);
    expect(isInvalidPageInput("check-out")).toBe(true);
    expect(isInvalidPageInput("user profile")).toBe(true);
  });

  it("returns false for single-word and camelCase + Page (new, New, newPage, NewPage, newpostPage)", () => {
    expect(isInvalidPageInput("new")).toBe(false);
    expect(isInvalidPageInput("New")).toBe(false);
    expect(isInvalidPageInput("newPage")).toBe(false);
    expect(isInvalidPageInput("NewPage")).toBe(false);
    expect(isInvalidPageInput("newpostPage")).toBe(false);
  });

  it("returns false for valid single-word page names", () => {
    expect(isInvalidPageInput("dashboard")).toBe(false);
    expect(isInvalidPageInput("checkout")).toBe(false);
    expect(isInvalidPageInput("Dashboard")).toBe(false);
  });

  it("returns false for valid PascalCase names", () => {
    expect(isInvalidPageInput("UserProfile")).toBe(false);
    expect(isInvalidPageInput("CheckoutFlow")).toBe(false);
  });

  it("returns false for dashBoardPage (camelCase + Page)", () => {
    expect(isInvalidPageInput("dashBoardPage")).toBe(false);
  });

  it("returns false for Dashboardpage (PascalCase + lowercase page)", () => {
    expect(isInvalidPageInput("Dashboardpage")).toBe(false);
  });

  it("returns false for DashboardPage (PascalCase + Page)", () => {
    expect(isInvalidPageInput("DashboardPage")).toBe(false);
  });

  it("returns true for bare 'Page' or 'page' (reserved suffix, not a real page name)", () => {
    expect(isInvalidPageInput("Page")).toBe(true);
    expect(isInvalidPageInput("page")).toBe(true);
  });

  it("returns true for names with leading or trailing spaces (non-letter)", () => {
    expect(isInvalidPageInput("  dashboard  ")).toBe(true);
    expect(isInvalidPageInput(" checkout ")).toBe(true);
  });

  it("returns true for mixed invalid input like payment.jsPage", () => {
    expect(isInvalidPageInput("payment.jsPage")).toBe(true);
  });

  it("returns false for single letter names", () => {
    expect(isInvalidPageInput("a")).toBe(false);
  });

  it("returns false for all-uppercase names", () => {
    expect(isInvalidPageInput("DASHBOARD")).toBe(false);
  });

  it("naming-rule alignment: dashBoardPage, Dashboardpage, DashboardPage, DASHBOARD are valid", () => {
    expect(isInvalidPageInput("dashBoardPage")).toBe(false);
    expect(isInvalidPageInput("Dashboardpage")).toBe(false);
    expect(isInvalidPageInput("DashboardPage")).toBe(false);
    expect(isInvalidPageInput("DASHBOARD")).toBe(false);
  });
});

describe("normalizePageName", () => {
  it("appends Page and uses PascalCase for single word", () => {
    expect(normalizePageName("dashboard")).toBe("DashboardPage");
    expect(normalizePageName("checkout")).toBe("CheckoutPage");
  });

  it("strips trailing 'page' (case insensitive) then appends Page", () => {
    expect(normalizePageName("dashboardpage")).toBe("DashboardPage");
  });

  it("splits camelCase into words and PascalCases each", () => {
    expect(normalizePageName("userProfile")).toBe("UserProfilePage");
    expect(normalizePageName("checkoutFlow")).toBe("CheckoutFlowPage");
  });

  it("trims whitespace", () => {
    expect(normalizePageName("  dashboard  ")).toBe("DashboardPage");
  });

  it("produces valid class name for multi-word input", () => {
    expect(normalizePageName("UserProfile")).toBe("UserProfilePage");
  });

  it("aligns with naming rules: dashBoardPage → DashBoardPage", () => {
    expect(normalizePageName("dashBoardPage")).toBe("DashBoardPage");
  });

  it("aligns with naming rules: Dashboardpage → DashboardPage", () => {
    expect(normalizePageName("Dashboardpage")).toBe("DashboardPage");
  });

  it("aligns with naming rules: DashboardPage → DashboardPage", () => {
    expect(normalizePageName("DashboardPage")).toBe("DashboardPage");
  });

  it("aligns with naming rules: DASHBOARD → DashboardPage", () => {
    expect(normalizePageName("DASHBOARD")).toBe("DashboardPage");
  });

  it("single letter becomes single-letter Page class", () => {
    expect(normalizePageName("a")).toBe("APage");
  });

  it("all-uppercase word is lowercased then first letter up", () => {
    expect(normalizePageName("CHECKOUT")).toBe("CheckoutPage");
  });

  it("trailing 'Page' is stripped then re-appended (idempotent-style)", () => {
    expect(normalizePageName("DashboardPage")).toBe("DashboardPage");
    expect(normalizePageName("UserProfilePage")).toBe("UserProfilePage");
  });
});

describe("createPageFileContent", () => {
  it("returns string that imports BasePage and defines class extending it", () => {
    const content = createPageFileContent("DashboardPage");
    expect(content).toContain('import BasePage from "./BasePage.js"');
    expect(content).toContain("class DashboardPage extends BasePage");
    expect(content).toContain("constructor(page)");
    expect(content).toContain("super(page)");
    expect(content).toContain("export default DashboardPage");
  });

  it("uses the given className in class definition and export", () => {
    const content = createPageFileContent("CheckoutPage");
    expect(content).toContain("class CheckoutPage extends BasePage");
    expect(content).toContain("export default CheckoutPage");
  });

  it("returns TypeScript content when lang is ts", () => {
    const content = createPageFileContent("DashboardPage", "ts");
    expect(content).toContain('import type { Page } from "@playwright/test"');
    expect(content).toContain('import BasePage from "./BasePage"');
    expect(content).toContain("constructor(page: Page)");
    expect(content).toContain("class DashboardPage extends BasePage");
    expect(content).toContain("export default DashboardPage");
  });
});

describe("getProjectPath", () => {
  it("joins cwd and project name", () => {
    expect(getProjectPath("/home/user", "my-project")).toBe("/home/user/my-project");
    expect(getProjectPath("C:\\dev", "app")).toMatch(/app$/);
  });
});

describe("parsePageInputs", () => {
  it("returns empty array for empty or non-string input", () => {
    expect(parsePageInputs("")).toEqual([]);
    expect(parsePageInputs(null)).toEqual([]);
    expect(parsePageInputs(undefined)).toEqual([]);
  });

  it("splits on whitespace and filters empty", () => {
    expect(parsePageInputs("dashboard payment")).toEqual(["dashboard", "payment"]);
    expect(parsePageInputs("  a   b  c  ")).toEqual(["a", "b", "c"]);
  });
});

describe("getUniquePageFileNames", () => {
  it("filters invalid inputs and returns unique class/file specs", () => {
    const specs = getUniquePageFileNames(["dashboard", "invalid.js", "checkout", "dashboard"]);
    expect(specs).toHaveLength(2);
    expect(specs[0]).toEqual({ className: "DashboardPage", fileName: "DashboardPage.js" });
    expect(specs[1]).toEqual({ className: "CheckoutPage", fileName: "CheckoutPage.js" });
  });

  it("dedupes by normalized class name (dashboard vs Dashboard → one spec)", () => {
    const specs = getUniquePageFileNames(["dashboard", "Dashboard"]);
    expect(specs).toHaveLength(1);
    expect(specs[0].className).toBe("DashboardPage");
  });

  it("returns .ts file names when lang is ts", () => {
    const specs = getUniquePageFileNames(["dashboard", "checkout"], "ts");
    expect(specs).toHaveLength(2);
    expect(specs[0]).toEqual({ className: "DashboardPage", fileName: "DashboardPage.ts" });
    expect(specs[1]).toEqual({ className: "CheckoutPage", fileName: "CheckoutPage.ts" });
  });
});

describe("getPageContentsToWrite", () => {
  it("returns fileName and content for each spec using createPageFileContent", () => {
    const specs = [
      { className: "DashboardPage", fileName: "DashboardPage.js" },
      { className: "CheckoutPage", fileName: "CheckoutPage.js" },
    ];
    const out = getPageContentsToWrite(specs);
    expect(out).toHaveLength(2);
    expect(out[0].fileName).toBe("DashboardPage.js");
    expect(out[0].content).toContain("class DashboardPage extends BasePage");
    expect(out[1].fileName).toBe("CheckoutPage.js");
    expect(out[1].content).toContain("class CheckoutPage extends BasePage");
  });

  it("returns .ts file names and TS content when lang is ts", () => {
    const specs = [
      { className: "DashboardPage", fileName: "DashboardPage.ts" },
      { className: "CheckoutPage", fileName: "CheckoutPage.ts" },
    ];
    const out = getPageContentsToWrite(specs, "ts");
    expect(out).toHaveLength(2);
    expect(out[0].fileName).toBe("DashboardPage.ts");
    expect(out[0].content).toContain("constructor(page: Page)");
    expect(out[0].content).toContain('import type { Page } from "@playwright/test"');
    expect(out[1].fileName).toBe("CheckoutPage.ts");
    expect(out[1].content).toContain("class CheckoutPage extends BasePage");
  });
});

describe("helper flow: parsePageInputs → getUniquePageFileNames → getPageContentsToWrite", () => {
  it("parses input, filters invalid, dedupes, and produces write list", () => {
    const raw = parsePageInputs("dashboard  Dashboard  payment.js  checkout");
    const specs = getUniquePageFileNames(raw);
    const toWrite = getPageContentsToWrite(specs);
    expect(specs.length).toBe(2);
    expect(toWrite.map((w) => w.fileName)).toEqual(["DashboardPage.js", "CheckoutPage.js"]);
    toWrite.forEach((w) => {
      expect(w.content).toContain('import BasePage from "./BasePage.js"');
    });
  });
});

describe("hasPlaywrightInstalled", () => {
  it("returns true when package.json has playwright or @playwright/test", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-has-"));
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ devDependencies: { "@playwright/test": "1.0.0" } }),
      "utf-8"
    );
    expect(hasPlaywrightInstalled(tmp)).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns false when package.json has no playwright deps", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-has-"));
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ devDependencies: { "vitest": "1.0.0" } }),
      "utf-8"
    );
    expect(hasPlaywrightInstalled(tmp)).toBe(false);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns false when package.json is missing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-has-"));
    expect(hasPlaywrightInstalled(tmp)).toBe(false);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("detectPlaywrightLang", () => {
  it("returns ts when playwright.config.ts exists", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-lang-"));
    fs.writeFileSync(path.join(tmp, "playwright.config.ts"), "", "utf-8");
    expect(detectPlaywrightLang(tmp)).toBe("ts");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns js when only playwright.config.js exists", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-lang-"));
    fs.writeFileSync(path.join(tmp, "playwright.config.js"), "", "utf-8");
    expect(detectPlaywrightLang(tmp)).toBe("js");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns ts when package.json has playwright and typescript", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-lang-"));
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ devDependencies: { "@playwright/test": "1.0.0", typescript: "5.0.0" } }),
      "utf-8"
    );
    expect(detectPlaywrightLang(tmp)).toBe("ts");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns js when package.json has playwright but no typescript", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-lang-"));
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ devDependencies: { "@playwright/test": "1.0.0" } }),
      "utf-8"
    );
    expect(detectPlaywrightLang(tmp)).toBe("js");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns null when no package.json", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-lang-"));
    expect(detectPlaywrightLang(tmp)).toBe(null);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("isAlreadyScaffolded", () => {
  it("returns false when pages/BasePage.js and BasePage.ts are missing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-check-"));
    expect(isAlreadyScaffolded(tmp)).toBe(false);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns true when pages/BasePage.js exists", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-check-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "pages", "BasePage.js"), "", "utf-8");
    expect(isAlreadyScaffolded(tmp)).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns true when pages/BasePage.ts exists", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-check-"));
    fs.mkdirSync(path.join(tmp, "pages"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "pages", "BasePage.ts"), "", "utf-8");
    expect(isAlreadyScaffolded(tmp)).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("ensureStatesInGitignore", () => {
  it("creates .gitignore with states when missing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-gitignore-"));
    ensureStatesInGitignore(tmp);
    const content = fs.readFileSync(path.join(tmp, ".gitignore"), "utf-8");
    expect(content).toContain("states");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("appends states when .gitignore exists without it", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-gitignore-"));
    fs.writeFileSync(path.join(tmp, ".gitignore"), "node_modules\n", "utf-8");
    ensureStatesInGitignore(tmp);
    const content = fs.readFileSync(path.join(tmp, ".gitignore"), "utf-8");
    expect(content).toContain("node_modules");
    expect(content).toContain("states");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("does not duplicate states when already present", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-gitignore-"));
    fs.writeFileSync(path.join(tmp, ".gitignore"), "node_modules\nstates\n", "utf-8");
    ensureStatesInGitignore(tmp);
    const content = fs.readFileSync(path.join(tmp, ".gitignore"), "utf-8");
    expect(content.match(/\bstates\b/g)).toHaveLength(1);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("copyDirectory", () => {
  it("copies directory structure and files", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pom-test-"));
    const src = path.join(tmp, "src");
    const dest = path.join(tmp, "dest");
    fs.mkdirSync(src, { recursive: true });
    fs.mkdirSync(path.join(src, "nested"), { recursive: true });
    fs.writeFileSync(path.join(src, "a.txt"), "a");
    fs.writeFileSync(path.join(src, "nested", "b.txt"), "b");
    copyDirectory(src, dest);
    expect(fs.readFileSync(path.join(dest, "a.txt"), "utf-8")).toBe("a");
    expect(fs.readFileSync(path.join(dest, "nested", "b.txt"), "utf-8")).toBe("b");
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
