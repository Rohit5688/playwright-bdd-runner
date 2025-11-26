/**
 * Manual test to verify step matching fix
 * Run this in the VS Code Debug Console or Node REPL
 */

// Test pattern from step definition
const pattern = "through API for {string} aggregator and {string} I get response with body {string}";

// Test case 1: All literal values
const stepText1 = "through API for 'external' aggregator and 'desktop' I get response with body 'aggregator_request_body'";

// Test case 2: With scenario outline placeholder
const stepText2 = "through API for 'external' aggregator and '<device_type>' I get response with body 'aggregator_request_body'";

// Apply the NEW regex transformation logic
let enhancedPattern = pattern;

// Handle Cucumber parameters FIRST
enhancedPattern = enhancedPattern
    .replace(/\{string\}/g, "(?:'[^']*'|\"[^\"]*\")")  // {string} -> match any quoted string
    .replace(/\{int\}/g, '(?:\\d+|<[^>]+>)')              // {int} -> match numbers or <placeholder>
    .replace(/\{float\}/g, '(?:\\d+\\.?\\d*|<[^>]+>)')    // {float} -> match decimals or <placeholder>
    .replace(/\{word\}/g, '(?:[a-zA-Z0-9_]+|<[^>]+>)')  // {word} -> match word chars or <placeholder>
    .replace(/\{[^}]+\}/g, '(?:[^\\s]+|<[^>]+>)');    // {anyParam} -> match non-space or <placeholder>

// Normalize whitespace
enhancedPattern = enhancedPattern.replace(/\s+/g, '\\s+');

console.log('Pattern:', pattern);
console.log('Enhanced Pattern:', enhancedPattern);
console.log('');

// Test both cases
const regex = new RegExp(`^${enhancedPattern}$`, 'i');

console.log('Test 1 (all literals):', stepText1);
console.log('Match:', regex.test(stepText1));
console.log('');

console.log('Test 2 (with <device_type>):', stepText2);
console.log('Match:', regex.test(stepText2));
