const fs = require('fs');
const path = require('path');

const sourceDir = '/d/claude/cypress/e2e';
const targetDir = '/d/cypress-to-playwright-converted/tests';

// Template for Playwright test
const playwrightTemplate = (content, filename) => {
    // Basic conversions
    let result = content
        .replace(/describe\(/g, 'test.describe(')
        .replace(/\bit\(/g, 'test(')
        .replace(/test\('([^']+)',\s*\(\)\s*=>\s*\{/g, "test('$1', async ({ page }) => {")
        .replace(/cy\.visit\(/g, 'await page.goto(')
        .replace(/cy\.get\(/g, 'await page.locator(')
        .replace(/cy\.wait\(/g, 'await page.waitForTimeout(')
        .replace(/cy\.contains\(/g, 'await page.locator(\'text=')
        .replace(/\.should\('be\.visible'\)/g, '; await expect(locator).toBeVisible()')
        .replace(/\.should\('contain',([^)]+)\)/g, '; await expect(locator).toContainText($1)')
        .replace(/\.click\(\)/g, '; await locator.click()')
        .replace(/\.clear\(\)/g, '; await locator.clear()')
        .replace(/\.type\(/g, '; await locator.fill(')
        .replace(/\.check\(\)/g, '; await locator.check()')
        .replace(/\.select\(/g, '; await locator.selectOption(')
        .replace(/Cypress\.config\([^)]+\);/g, '// Configuration handled by Playwright')
        .replace(/Cypress\.on\([^)]+\);/g, '// Uncaught exceptions handled by Playwright');

    // Add imports and setup
    const imports = `const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

`;

    const setupHooks = `let config;
    let helpers;

    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.clearStorageAndSetTimeouts();
        test.setTimeout(200000);
    });

    `;

    // Remove existing before/beforeEach hooks
    result = result.replace(/before\(\(\) => \{[\s\S]*?\}\);/g, '');
    result = result.replace(/beforeEach\(\(\) => \{[\s\S]*?\}\);/g, '');

    // Add helper initialization in test
    result = result.replace(
        /test\('([^']+)', async \(\{ page \}\) => \{/g,
        `test('$1', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();`
    );

    // Insert setup after test.describe
    result = result.replace(
        /(test\.describe\([^{]+\{\s*)/,
        `$1${setupHooks}`
    );

    return imports + result;
};

// Get all files to convert
const files = fs.readdirSync(sourceDir).filter(f => f.startsWith('TS') && f.endsWith('.cy.js'));

const alreadyConverted = [
    'TS001_listOfDevice.cy.js',
    'TS002_addEditDevices.cy.js',
    'TS003_ChangeTimezone.cy.js',
    'TS004_viewEditUser.cy.js',
    'TS005_subgroup.cy.js',
    'TS006_trackInfoDisplayOptions.cy.js',
    'TS007_pulsingIcon.cy.js'
];

let converted = 0;
let errors = 0;

files.forEach(file => {
    if (alreadyConverted.includes(file)) {
        console.log(`Skipping: ${file}`);
        return;
    }

    try {
        const sourcePath = path.join(sourceDir, file);
        const content = fs.readFileSync(sourcePath, 'utf8');
        
        const convertedContent = playwrightTemplate(content, file);
        
        const targetFile = file.replace('.cy.js', '.spec.js');
        const targetPath = path.join(targetDir, targetFile);
        
        fs.writeFileSync(targetPath, convertedContent);
        console.log(`✓ Converted: ${file} -> ${targetFile}`);
        converted++;
    } catch (error) {
        console.error(`✗ Error converting ${file}: ${error.message}`);
        errors++;
    }
});

console.log(`\n=== Conversion Summary ===`);
console.log(`Files processed: ${files.length}`);
console.log(`Already converted: ${alreadyConverted.length}`);
console.log(`Newly converted: ${converted}`);
console.log(`Errors: ${errors}`);
console.log(`Total converted files: ${converted + alreadyConverted.length}`);