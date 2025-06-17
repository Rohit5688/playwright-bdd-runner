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