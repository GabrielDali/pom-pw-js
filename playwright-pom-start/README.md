# create-playwright-pom-start

Scaffold a **Playwright Page Object Model (POM)** project with one command.

## How to start

From an empty folder (or where you want the project):

```bash
npm init playwright-pom-start
```

You’ll be prompted for:

1. **Language** — JavaScript or TypeScript (arrow keys + Enter)
2. **Project name** — if you didn’t pass it (e.g. `npm init playwright-pom-start my-project`)
3. **Page names** — optional; space-separated, or Enter to skip
4. **Playwright** — installed automatically if missing

Then you get a ready-to-use structure: `pages/`, `utils/`, `fixtures/`, base page, global setup/teardown, and Playwright config.

**Requirements:** Node.js **v18** or later.

## More options

- **Install the CLI and run it:** `npm i playwright-pom` then `npx playwright-pom` or `npx playwright-pom my-project`
- **Full docs:** [playwright-pom](https://www.npmjs.com/package/playwright-pom) on npm
