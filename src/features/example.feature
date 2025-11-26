Feature: Example feature

  @smoke
  Scenario Outline: Example scenario
    Given I open the '<value>' homepage
    When I click on the login button
    Then I should see the login form
    Examples:
      | value               |
      | https://example.com |
      | https://example.org |
      | https://example.net |

  Scenario Outline: Example scenario2
    Given through API for 'external' aggregator and 'desktop' I get response with body 'aggregator_request_body'
    Given through API for 'external' aggregator and '<device_type>' I get response with body 'aggregator_request_body'
    Examples:
      | device_type |
      | desktop     |
      | mobile      |
  Scenario: Complex step permutations
    Given I have a step with "double quotes"
    And I have a step with 'single quotes'
    And I have a step with "mixed" and 'quotes'
    When I pass the number 42
    And I pass the float 3.14
    And I pass multiple parameters "param1", 123, and 'param3'
    Then I should see special characters like !@#$%^&*()
    And I verify the "user" has role 'admin' with id 999
