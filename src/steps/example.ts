import { createBdd } from 'playwright-bdd';
const { Given, When, Then } = createBdd();

Given('I open the homepage', async ({ page }) => {
  await page.goto('https://example.com');
});

When('I click on the login button', async ({ page }) => {
  await page.click('#login');
});

Then('I should see the login form', async ({ page }) => {
  await page.waitForSelector('#login-form');
});
