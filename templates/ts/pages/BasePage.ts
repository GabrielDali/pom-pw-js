import type { Page } from "@playwright/test";

class BasePage {
  constructor(protected page: Page) {}

  // Add common page methods here
}

export default BasePage;
