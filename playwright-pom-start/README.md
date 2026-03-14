# create-playwright-pom-start

Scaffold a **Playwright Page Object Model (POM)** structure for test projects in **JavaScript** or **TypeScript** with one command. Creates a base page, optional page classes, folders, global setup/teardown, and installs Playwright when needed.

## How to start

From an empty folder (or where you want the project):

```bash
npm init playwright-pom-start
```

Or with a project name:

```bash
npm init playwright-pom-start my-playwright-project
```



You’ll be prompted for:

1. **Language** — JavaScript or TypeScript (arrow keys + Enter). Default is JS.
2. **Page names** — optional; space-separated, or Enter to skip. Names are normalized to PascalCase + `Page` (e.g. `dashboard` → `DashboardPage`).
3. **Playwright** — installed automatically if missing.

**Requirements:** Node.js **v18** or later.

## Alternative: install then run

```bash
npm i playwright-pom
npx playwright-pom
```

Or scaffold in a subfolder: `npx playwright-pom my-project`

To **add more pages** to an existing project, run from the project root: `npx playwright-pom add pages`.

## Flow

- If Playwright is **already installed** in the folder, the CLI detects JS or TS and skips the language question.
- Templates are copied, folders and placeholder files are created.
- If Playwright isn’t installed yet, the CLI runs `npm init playwright@latest -- --quiet --lang=js` or `--lang=ts` to match the chosen language.
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
