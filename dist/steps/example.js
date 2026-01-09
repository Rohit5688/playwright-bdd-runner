"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_bdd_1 = require("playwright-bdd");
const { Given, When, Then } = (0, playwright_bdd_1.createBdd)();
Given('I open the homepage', ({ page }) => __awaiter(void 0, void 0, void 0, function* () {
    yield page.goto('https://example.com');
}));
When('I click on the login button', ({ page }) => __awaiter(void 0, void 0, void 0, function* () {
    yield page.click('#login');
}));
Then('I should see the login form', ({ page }) => __awaiter(void 0, void 0, void 0, function* () {
    yield page.waitForSelector('#login-form');
}));
