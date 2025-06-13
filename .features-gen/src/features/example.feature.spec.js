// Generated from: src/features/example.feature
import { test } from "playwright-bdd";

test.describe('Example feature', () => {

  test('Example scenario', { tag: ['@smoke'] }, async ({ Given, page, When, Then }) => { 
    await Given('I open the homepage', null, { page }); 
    await When('I click on the login button', null, { page }); 
    await Then('I should see the login form', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: ({}, use) => use(test),
  $uri: ({}, use) => use('src/features/example.feature'),
  $bddFileData: ({}, use) => use(bddFileData),
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I open the homepage","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"When I click on the login button","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"Then I should see the login form","stepMatchArguments":[]}]},
]; // bdd-data-end