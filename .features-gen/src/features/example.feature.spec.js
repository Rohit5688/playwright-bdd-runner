// Generated from: src\features\example.feature
import { test } from "playwright-bdd";

test.describe('Example feature', () => {

  test.describe('Example scenario', () => {

    test('Example #1', { tag: ['@smoke'] }, async ({ Given, page, When, Then }) => { 
      await Given('I open the \'https://example.com\' homepage', null, { page }); 
      await When('I click on the login button', null, { page }); 
      await Then('I should see the login form', null, { page }); 
    });

    test('Example #2', { tag: ['@smoke'] }, async ({ Given, page, When, Then }) => { 
      await Given('I open the \'https://example.org\' homepage', null, { page }); 
      await When('I click on the login button', null, { page }); 
      await Then('I should see the login form', null, { page }); 
    });

    test('Example #3', { tag: ['@smoke'] }, async ({ Given, page, When, Then }) => { 
      await Given('I open the \'https://example.net\' homepage', null, { page }); 
      await When('I click on the login button', null, { page }); 
      await Then('I should see the login form', null, { page }); 
    });

  });

  test.describe('Example scenario2', () => {

    test('Example #1', async ({ Given, page }) => { 
      await Given('through API for \'external\' aggregator and \'desktop\' I get response with body \'aggregator_request_body\'', null, { page }); 
      await Given('through API for \'external\' aggregator and \'desktop\' I get response with body \'aggregator_request_body\'', null, { page }); 
    });

    test('Example #2', async ({ Given, page }) => { 
      await Given('through API for \'external\' aggregator and \'desktop\' I get response with body \'aggregator_request_body\'', null, { page }); 
      await Given('through API for \'external\' aggregator and \'mobile\' I get response with body \'aggregator_request_body\'', null, { page }); 
    });

  });

});

// == technical section ==

test.use({
  $test: ({}, use) => use(test),
  $uri: ({}, use) => use('src\\features\\example.feature'),
  $bddFileData: ({}, use) => use(bddFileData),
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":8,"pickleLine":10,"tags":["@smoke"],"steps":[{"pwStepLine":9,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I open the 'https://example.com' homepage","stepMatchArguments":[{"group":{"start":11,"value":"'https://example.com'","children":[{"children":[{"children":[]}]},{"start":12,"value":"https://example.com","children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"When I click on the login button","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"Then I should see the login form","stepMatchArguments":[]}]},
  {"pwTestLine":14,"pickleLine":11,"tags":["@smoke"],"steps":[{"pwStepLine":15,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I open the 'https://example.org' homepage","stepMatchArguments":[{"group":{"start":11,"value":"'https://example.org'","children":[{"children":[{"children":[]}]},{"start":12,"value":"https://example.org","children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"When I click on the login button","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"Then I should see the login form","stepMatchArguments":[]}]},
  {"pwTestLine":20,"pickleLine":12,"tags":["@smoke"],"steps":[{"pwStepLine":21,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I open the 'https://example.net' homepage","stepMatchArguments":[{"group":{"start":11,"value":"'https://example.net'","children":[{"children":[{"children":[]}]},{"start":12,"value":"https://example.net","children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":22,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"When I click on the login button","stepMatchArguments":[]},{"pwStepLine":23,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"Then I should see the login form","stepMatchArguments":[]}]},
  {"pwTestLine":30,"pickleLine":19,"tags":[],"steps":[{"pwStepLine":31,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"Given through API for 'external' aggregator and 'desktop' I get response with body 'aggregator_request_body'","stepMatchArguments":[{"group":{"start":17,"value":"external","children":[]}},{"group":{"start":43,"value":"desktop","children":[]}},{"group":{"start":78,"value":"aggregator_request_body","children":[]}}]},{"pwStepLine":32,"gherkinStepLine":16,"keywordType":"Context","textWithKeyword":"Given through API for 'external' aggregator and 'desktop' I get response with body 'aggregator_request_body'","stepMatchArguments":[{"group":{"start":17,"value":"external","children":[]}},{"group":{"start":43,"value":"desktop","children":[]}},{"group":{"start":78,"value":"aggregator_request_body","children":[]}}]}]},
  {"pwTestLine":35,"pickleLine":20,"tags":[],"steps":[{"pwStepLine":36,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"Given through API for 'external' aggregator and 'desktop' I get response with body 'aggregator_request_body'","stepMatchArguments":[{"group":{"start":17,"value":"external","children":[]}},{"group":{"start":43,"value":"desktop","children":[]}},{"group":{"start":78,"value":"aggregator_request_body","children":[]}}]},{"pwStepLine":37,"gherkinStepLine":16,"keywordType":"Context","textWithKeyword":"Given through API for 'external' aggregator and 'mobile' I get response with body 'aggregator_request_body'","stepMatchArguments":[{"group":{"start":17,"value":"external","children":[]}},{"group":{"start":43,"value":"mobile","children":[]}},{"group":{"start":77,"value":"aggregator_request_body","children":[]}}]}]},
]; // bdd-data-end