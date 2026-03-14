# playwright-pom

CLI that scaffolds a **Page Object Model (POM)** structure for Playwright test projects in **JavaScript** or **TypeScript**. It creates a base page, optional page classes, folders, global setup/teardown, and installs Playwright when needed.

## Install


```bash
npm init playwright-pom-start
```

Or install then run:

```bash
npm i playwright-pom
npx playwright-pom
```

**Requirements:** Node.js **v18** or later (LTS recommended). Supported on **Windows**, **macOS**, and **Linux** (paths and `npm` commands are cross-platform).

## Usage

**Scaffold in the current folder** (e.g. open terminal in your project, then):

```bash
npx playwright-pom
```

**Scaffold in a new subfolder:**

```bash
npx playwright-pom my-playwright-project
```

### Flow

1. **Language**  
   - If Playwright is **already installed** in the folder, the CLI detects JS or TS from config/package and skips the question.  
   - If not, you choose **JS** or **TS** with **← →** arrow keys (selected option is green and underlined), then **Enter**. Default is JS.

2. **Structure**  
   Templates are copied, folders and placeholder files are created.

3. **Pages**  
   You’re asked to add page names (space-separated), or **Enter** to skip. Names are normalized to PascalCase + `Page` (e.g. `dashboard` → `DashboardPage`).

4. **Playwright**  
   If Playwright isn’t installed yet, the CLI runs `npm init playwright@latest -- --quiet --lang=js` or `--lang=ts` to match the chosen language.

### Re-run in the same project

If the folder already has a scaffold (e.g. `pages/BasePage.js` or `pages/BasePage.ts`), the CLI prints **"Project already set up. Skipping."** and, if there’s a `package.json`, runs `npm install` so you see the usual “up to date” / “packages audited” output.

### Add pages to an existing project

From the **project root** (where the `pages/` folder lives), run:

```bash
npx playwright-pom add pages
```

You’ll be prompted to type page names (space-separated) or Enter to skip. Do **not** type `add pages` in the terminal by itself—that runs a shell command called `add` and will report “command not found.” Always use the full command above.

## Generated structure

```
<project>/
├── pages/
│   ├── BasePage.js or BasePage.ts
│   └── ... (any pages you added)
├── utils/
│   ├── logger.js or logger.ts
│   └── auth/
├── fixtures/
├── constants/
├── states/                 # in .gitignore
├── global-setup.js or .ts
├── global-teardown.js or .ts
└── .gitignore              # includes states
```

- **BasePage** — Shared class with the Playwright `page`; other pages extend it.  
- **utils/logger** — Placeholder for your logger.  
- **utils/auth** — For auth-related helpers.  
- **global-setup** / **global-teardown** — Default async functions; wire them in `playwright.config.*` if you use them.

## Page naming

- Letters only (no numbers, `.js`/`.ts`, or symbols).  
- Converted to PascalCase + `Page` (e.g. `checkout` → `CheckoutPage`, `userProfile` → `UserProfilePage`).  
- Invalid tokens and existing files are skipped (reported in the console).

## Safe updates

- The package follows **semver** (breaking changes = major version).  
- To avoid surprise changes: `npm i playwright-pom@1.0.0`.  
- In generated projects, keep `package-lock.json` and run tests after upgrading deps.

## Development

- **Repo:** [github.com/GabrielDali/pom-pw-js](https://github.com/GabrielDali/pom-pw-js)
- Work on the **test** branch; open a PR into **main**. GitHub Actions run `npm test` (Vitest, including `lib/helpers.test.js`) on push to **test** and on pull requests to **main** — merge only when the workflow passes.

## Author & license

**Author:** [Gabriel Dali](https://www.linkedin.com/in/gabriel-dali-qa/)  
**License:** MIT
