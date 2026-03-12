# playwright-pom — Overview

A CLI package that scaffolds a **Page Object Model (POM)** file structure for Playwright test projects in **JavaScript (ES6)** or **TypeScript**. It creates a base page and optional page classes so you can start writing tests with a consistent, maintainable structure.

---

## What It Does

- Creates a new project folder in the current directory.
- Lets you choose **JS** (default) or **TS** via an arrow-key list prompt.
- Copies the matching `templates/js` or `templates/ts` structure (including a base page) into that folder. For TS, adds `tsconfig.json` and typed Page classes.
- Optionally generates additional page classes that extend the base page.
- Uses ES6 modules (`import`/`export`) and classes (and TypeScript types when TS is selected).

---

## Usage

**One command (prompted immediately, like `npm init playwright@latest`):**

```bash
npm init playwright-pom-start
```

**Install (then run from any folder):**

```bash
npm i playwright-pom
npx playwright-pom my-playwright-project
```

**With project name:** `npx playwright-pom my-playwright-project`  
**Interactive (prompted for project name):** `npx playwright-pom` then enter the name when prompted.

**From the repo (development):** `npm start` or `npm start my-playwright-project`

**Language (JS/TS):**

- You are asked: **Select programming language (JS/TS)**. Use **arrow keys** to choose **JavaScript** or **TypeScript**, then Enter. **Pressing Enter without moving** selects **JavaScript** (default). If you choose TypeScript, the project gets `.ts` files, typed Page classes, and a `tsconfig.json`.

**Add pages when prompted:**

- To add pages: type names separated by spaces, e.g. `dashboard payment checkout`.
- To skip: press Enter. Only the base page (and any other template files) will be created.

---

## Generated Structure

After running the CLI you get something like:

```
<project-name>/
├── pages/
│   ├── BasePage.js / .ts  # Always present (from templates)
│   ├── DashboardPage.js   # If you added "dashboard"
│   └── ...
├── utils/
│   └── auth/              # Place auth-related helpers here
├── fixtures/              # Empty; for test data / fixtures
├── constants/             # Empty; for constants
└── states/                # Empty; for shared state objects
```

- **BasePage.js** — Shared base class that receives the Playwright `page` and holds common logic (selectors, helpers). All other pages extend it.
- **&lt;Name&gt;Page.js** — One class per screen/flow; each extends `BasePage` and is ready for selectors and methods.

---

## Page Naming Rules

The CLI normalizes what you type into valid class/file names:

- Accepts letters only (no numbers, symbols, or `.js`).
- Converts to PascalCase and appends `Page` (e.g. `checkout` → `CheckoutPage`).
- Skips invalid tokens and existing files (reports “skipped” in the console).

---

## Technical Stack

- **Runtime:** Node.js (uses `fs`, `path`, `readline`).
- **Module system:** ES modules (`"type": "module"` in package.json).
- **Output:** ES6 classes and `export default` for use with Playwright in a JS/ES6 project.

---

## Re-running and updates

- **Run again in the same project:** If you run `npx playwright-pom` in a folder that’s already scaffolded (has `pages/BasePage.js` or `pages/BasePage.ts`), the CLI prints **"Project already set up. Skipping."** and does not overwrite anything. If the project has a `package.json`, it then runs **`npm install`** there so you see npm’s usual output (e.g. "already up to date", "X packages audited").
- **Installing the CLI again:** `npm install playwright-pom` (or `npm i playwright-pom`) is handled by npm: if the version is already satisfied, npm reports "up to date" and the number of packages audited. No extra logic in this package.

**Making updates safe:** The package follows **semver** (breaking changes = major bump). To avoid surprise changes, pin the version when installing (e.g. `npm i playwright-pom@1.0.0`). In generated projects, keep `package-lock.json` and run your tests after upgrading dependencies.
---

## Requirements

- The `templates` folder must exist in the same directory as the package (typically the repo root) when you run the CLI.
- Target project folder must not already exist; the CLI will exit with an error if it does.

---

## Repo structure and publishing

- **playwright-pom** (root) — main CLI; users can `npm i playwright-pom` and `npx playwright-pom`.
- **playwright-pom-start/** — thin wrapper package `create-playwright-pom-start` that depends on `playwright-pom` and exposes the same CLI so `npm init playwright-pom-start` works (npm runs `npx create-playwright-pom-start`).

**Publish order:** 1) `npm publish` from repo root (playwright-pom). 2) `npm publish` from `playwright-pom-start/` so `npm init playwright-pom-start` resolves the wrapper and runs the CLI.

---

## Author & License

**Author:** Gabriel Dali  
**License:** MIT
