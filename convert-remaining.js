const fs = require('fs');
const path = require('path');

// Define the conversion mapping
const conversionMap = {
    'describe(': 'test.describe(',
    'it(': 'test(',
    'cy.visit(': 'await page.goto(',
    'cy.get(': 'await page.locator(',
    '.should(\'be.visible\')': '.toBeVisible()',
    '.click()': '.click()',
    '.click({': '.click({',
    '.type(': '.fill(',
    '.clear()': '.clear()',
    '.wait(': 'await page.waitForTimeout(',
    '.contains(': '.filter({ hasText: ',
    '.check()': '.check()',
    '.uncheck()': '.uncheck()',
    '.select(': '.selectOption(',
    'cy.wait(': 'await page.waitForTimeout(',
    'Cypress.config(': '// Playwright config handled in test.setTimeout(',
    'Cypress.on(\'uncaught:exception\', () => false);': '// Uncaught exceptions handled by Playwright by default'
};

function convertCypressToPlaywright(cypressContent, filename) {
    let playwrightContent = cypressContent;
    
    // Add required imports at the top
    playwrightContent = `const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

` + playwrightContent;

    // Replace describe with test.describe
    playwrightContent = playwrightContent.replace(/describe\(/g, 'test.describe(');
    
    // Replace it with test
    playwrightContent = playwrightContent.replace(/\bit\(/g, 'test(');
    
    // Add page parameter to test functions
    playwrightContent = playwrightContent.replace(/test\('([^']+)',\s*\(\)\s*=>\s*\{/g, "test('$1', async ({ page }) => {");
    
    // Replace before/beforeEach hooks
    playwrightContent = playwrightContent.replace(/before\(\(\) => \{[\s\S]*?\}\);/g, `test.beforeAll(async ({ browser }) => {
        // Create a page to load config
        const page = await browser.newPage();
        helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        await page.close();
    });`);
    
    playwrightContent = playwrightContent.replace(/beforeEach\(\(\) => \{[\s\S]*?\}\);/g, `test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.clearStorageAndSetTimeouts();
        
        // Set timeouts
        test.setTimeout(200000); // Generous timeout for long tests
    });`);
    
    // Add config and helpers declarations
    if (!playwrightContent.includes('let config;')) {
        playwrightContent = playwrightContent.replace(/test\.describe\(/, `let config;
    let helpers;

    test.describe(`);
    }
    
    // Initialize helpers and config in test
    playwrightContent = playwrightContent.replace(/test\('([^']+)', async \(\{ page \}\) => \{/, `test('$1', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();`);
    
    // Convert Cypress commands to Playwright
    playwrightContent = playwrightContent.replace(/cy\.visit\(/g, 'await page.goto(');
    playwrightContent = playwrightContent.replace(/cy\.get\(/g, 'await page.locator(');
    playwrightContent = playwrightContent.replace(/cy\.wait\(/g, 'await page.waitForTimeout(');
    
    // Convert .should('be.visible') to expect().toBeVisible()
    playwrightContent = playwrightContent.replace(/(\w+)\.should\('be\.visible'\)/g, 'await expect($1).toBeVisible()');
    
    // Convert .should('contain', text) to expect().toContainText()
    playwrightContent = playwrightContent.replace(/(\w+)\.should\('contain',\s*([^)]+)\)/g, 'await expect($1).toContainText($2)');
    
    // Convert basic method calls
    playwrightContent = playwrightContent.replace(/(\w+)\.click\(\)/g, 'await $1.click()');
    playwrightContent = playwrightContent.replace(/(\w+)\.clear\(\)/g, 'await $1.clear()');
    playwrightContent = playwrightContent.replace(/(\w+)\.type\(/g, 'await $1.fill(');
    playwrightContent = playwrightContent.replace(/(\w+)\.check\(\)/g, 'await $1.check()');
    playwrightContent = playwrightContent.replace(/(\w+)\.select\(/g, 'await $1.selectOption(');
    
    // Handle special cases
    playwrightContent = playwrightContent.replace(/Cypress\.config\([^)]+\);/g, '// Configuration handled by Playwright');
    playwrightContent = playwrightContent.replace(/Cypress\.on\('uncaught:exception'.*?\);/g, '// Uncaught exceptions handled by Playwright');
    
    return playwrightContent;
}

// Get list of files to convert (excluding already converted ones)
const sourceDir = '/d/claude/cypress/e2e';
const targetDir = '/d/cypress-to-playwright-converted/tests';

const convertedFiles = [
    'TS001_listOfDevice.spec.js',
    'TS002_addEditDevices.spec.js', 
    'TS003_ChangeTimezone.spec.js',
    'TS004_viewEditUser.spec.js',
    'TS005_subgroup.spec.js',
    'TS006_trackInfoDisplayOptions.spec.js'
];

console.log('Conversion mapping created successfully');
module.exports = { convertCypressToPlaywright };