<div align="center">
  <h1>Playwright POM framework</h1>
  <hr />
  <p><small>An open source CLI-tool for quick start with Page Object Model project and Playwright framework</small></p>
  <p>
    <a href="https://www.npmjs.com/package/create-playwright-pom-start"><img src="https://img.shields.io/npm/v/create-playwright-pom-start?color=0062cc" alt="npm version" /></a>
    <a href="https://github.com/GabrielDali/pom-pw-js/actions"><img src="https://img.shields.io/github/actions/workflow/status/GabrielDali/pom-pw-js/publish.yml?branch=main&label=CI&logo=github" alt="CI" /></a>
    <a href="https://www.npmjs.com/package/create-playwright-pom-start"><img src="https://img.shields.io/npm/l/create-playwright-pom-start?color=006e75" alt="MIT License" /></a>
  </p>
</div>

```bash
npm init playwright-pom-start
```

## Table of Contents

1. 💡 [Why use this](#why-use-this)
2. 🚀 [Getting started](#getting-started)
   - 2.1 [New project](#new-project)
   - 2.2 [Add pages to an existing project](#add-pages-to-an-existing-project)
3. ⚙️ [How it works](#how-it-works)
4. 🗂️ [Generated structure](#generated-structure)
5. 🏷️ [Page naming](#page-naming)
6. 🖼️ [Examples](#examples)
7. 🔗 [Repository & docs](#repository--docs)
8. 👤 [Author & license](#author--license)

## Why use this

Playwright gives you a powerful testing API but no folder structure. As your test suite grows, tests start reaching directly into selectors and actions, which means one UI change can break many tests instead of one. Page Object Model fixes that by keeping each page's interactions in one place. Your tests only call methods, not raw selectors.

Setting up POM manually means writing the same base class, the same folder layout, and the same boilerplate on every project. This CLI does it in one command: it creates the structure, scaffolds your first pages, and installs Playwright if it isn't there yet.

## Getting started

**Requirements:** Node.js **v18** or later.

### New project

Run in an empty folder or from any directory to scaffold into a named subfolder:

```bash
npm init playwright-pom-start
```

or into a subfolder:

```bash
npx playwright-pom my-project
```

You'll be prompted for:

1. **Language** — JavaScript or TypeScript (arrow keys + Enter). Default is JS. Skipped if Playwright is already detected in the folder.
2. **Page names** — optional; type names separated by spaces, or press Enter to skip. Names are normalized to PascalCase + `Page` (e.g. `dashboard` → `DashboardPage`).
3. **Playwright** — installed automatically if missing.

### Add pages to an existing project

Run from the root of your project, where the `pages` folder lives:

```bash
npx playwright-pom add pages
```

The CLI detects your project language from existing config files or the `pages` folder contents. If it can't detect a language, it asks. If no `pages` folder exists yet, it creates one and copies `BasePage` before prompting for page names.

## How it works

- If Playwright is **already installed** in the folder, the CLI detects JS or TS and skips the language question.
- Templates are copied, folders and placeholder files are created.
- If Playwright isn't installed yet, the CLI runs `npm init playwright@latest -- --quiet --lang=js` or `--lang=ts` to match the chosen language.
- If the folder already has a scaffold (e.g. `pages/BasePage.js` or `pages/BasePage.ts`), the CLI prints **"Project already set up. Skipping."** and may run `npm install`.

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

## Examples

**JavaScript based output project structure**

![JavaScript based output project structure](https://raw.githubusercontent.com/GabrielDali/pom-pw-js/main/assets/01.png)

**JavaScript based output created page example**

![JavaScript based output created page example](https://raw.githubusercontent.com/GabrielDali/pom-pw-js/main/assets/02.png)

**TypeScript based output project structure**

![TypeScript based output project structure](https://raw.githubusercontent.com/GabrielDali/pom-pw-js/main/assets/03.png)

**TypeScript based output created page example**

![TypeScript based output created page example](https://raw.githubusercontent.com/GabrielDali/pom-pw-js/main/assets/04.png)

## Repository & docs

- **GitHub:** [github.com/GabrielDali/pom-pw-js](https://github.com/GabrielDali/pom-pw-js)
- **Main package (playwright-pom):** [npmjs.com/package/playwright-pom](https://www.npmjs.com/package/playwright-pom)

## Author & license

**Author:** [Gabriel Dali](https://www.linkedin.com/in/gabriel-dali-qa/)
**License:** MIT
