"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_bdd_1 = require("playwright-bdd");
const { Given, When, Then } = (0, playwright_bdd_1.createBdd)();
Given('I open the homepage', async ({ page }) => {
    await page.goto('https://example.com');
});
When('I click on the login button', async ({ page }) => {
    await page.click('#login');
});
Then('I should see the login form', async ({ page }) => {
    await page.waitForSelector('#login-form');
});
//# sourceMappingURL=example.js.map