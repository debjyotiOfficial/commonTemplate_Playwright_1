const fs = require('fs');
const path = require('path');

function convertCypressToPlaywright(content, filename) {
    let result = content;
    
    // Add Playwright imports and TestHelpers
    result = `const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

` + result;

    // Convert describe to test.describe
    result = result.replace(/describe\(/g, 'test.describe(');
    
    // Add config and helpers variables
    result = result.replace(/test\.describe\(/g, `let config;
    let helpers;

    test.describe(`);
    
    // Convert it to test with async page parameter
    result = result.replace(/\bit\(/g, 'test(');
    result = result.replace(/test\('([^']+)',\s*\(\)\s*=>\s*\{/g, "test('$1', async ({ page }) => {");
    
    // Replace before hook
    result = result.replace(/before\(\(\) => \{[\s\S]*?\}\);/g, `test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        await page.close();
    });`);
    
    // Replace beforeEach hook
    result = result.replace(/beforeEach\(\(\) => \{[\s\S]*?\}\);/g, `test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.clearStorageAndSetTimeouts();
        test.setTimeout(200000);
    });`);
    
    // Add helper initialization in test
    result = result.replace(/test\('([^']+)', async \(\{ page \}\) => \{/, `test('$1', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();`);
    
    // Convert Cypress commands to Playwright
    result = result.replace(/cy\.visit\(/g, 'await page.goto(');
    result = result.replace(/cy\.get\(/g, 'await page.locator(');
    result = result.replace(/cy\.wait\(/g, 'await page.waitForTimeout(');
    result = result.replace(/cy\.contains\(/g, 'await page.locator(\'text=');
    result = result.replace(/cy\.clearCookies\(\)/g, 'await page.context().clearCookies()');
    result = result.replace(/cy\.clearLocalStorage\(\)/g, 'await page.evaluate(() => localStorage.clear())');
    
    // Convert method chaining patterns
    result = result.replace(/\.should\('be\.visible'\)/g, '; await expect(page.locator(selector)).toBeVisible()');
    result = result.replace(/\.should\('contain',\s*([^)]+)\)/g, '; await expect(page.locator(selector)).toContainText($1)');
    result = result.replace(/\.should\('have\.value',\s*([^)]+)\)/g, '; await expect(page.locator(selector)).toHaveValue($1)');
    result = result.replace(/\.should\('be\.checked'\)/g, '; await expect(page.locator(selector)).toBeChecked()');
    result = result.replace(/\.should\('not\.exist'\)/g, '; await expect(page.locator(selector)).not.toBeVisible()');
    result = result.replace(/\.should\('exist'\)/g, '; await expect(page.locator(selector)).toBeVisible()');
    
    // Convert basic actions
    result = result.replace(/(\n\s*)([^;\n]+)\.click\(\)/g, '$1await $2.click()');
    result = result.replace(/(\n\s*)([^;\n]+)\.clear\(\)/g, '$1await $2.clear()');
    result = result.replace(/(\n\s*)([^;\n]+)\.type\(([^)]+)\)/g, '$1await $2.fill($3)');
    result = result.replace(/(\n\s*)([^;\n]+)\.check\(\)/g, '$1await $2.check()');
    result = result.replace(/(\n\s*)([^;\n]+)\.uncheck\(\)/g, '$1await $2.uncheck()');
    result = result.replace(/(\n\s*)([^;\n]+)\.select\(([^)]+)\)/g, '$1await $2.selectOption($3)');
    
    // Handle special cases
    result = result.replace(/\.eq\((\d+)\)/g, '.nth($1)');
    result = result.replace(/\.first\(\)/g, '.first()');
    result = result.replace(/\.last\(\)/g, '.last()');
    result = result.replace(/\{ force: true \}/g, '{ force: true }');
    result = result.replace(/\{ multiple: true/g, '{ force: true');
    
    // Clean up Cypress-specific code
    result = result.replace(/Cypress\.config\([^)]+\);/g, '// Configuration handled by Playwright');
    result = result.replace(/Cypress\.on\('uncaught:exception'.*?\);/g, '// Uncaught exceptions handled by Playwright');
    
    // Fix common issues
    result = result.replace(/await page\.locator\(([^)]+)\)(\s*)(\/\/.*)?$/gm, 'const element = await page.locator($1);$2$3');
    result = result.replace(/; await expect\(page\.locator\(selector\)\)/g, '; await expect(element)');
    
    return result;
}

// Function to convert all files
function convertAllFiles() {
    const sourceDir = './e2e';
    const targetDir = '/d/cypress-to-playwright-converted/tests';
    
    // Get all TS*.cy.js files
    const files = fs.readdirSync(sourceDir).filter(file => 
        file.startsWith('TS') && file.endsWith('.cy.js')
    );
    
    // Already converted files (skip these)
    const alreadyConverted = [
        'TS001_listOfDevice.cy.js',
        'TS002_addEditDevices.cy.js',
        'TS003_ChangeTimezone.cy.js',
        'TS004_viewEditUser.cy.js',
        'TS005_subgroup.cy.js',
        'TS006_trackInfoDisplayOptions.cy.js'
    ];
    
    let converted = 0;
    
    files.forEach(file => {
        if (alreadyConverted.includes(file)) {
            console.log(`Skipping already converted: ${file}`);
            return;
        }
        
        try {
            const sourcePath = path.join(sourceDir, file);
            const content = fs.readFileSync(sourcePath, 'utf8');
            
            const convertedContent = convertCypressToPlaywright(content, file);
            
            const targetFile = file.replace('.cy.js', '.spec.js');
            const targetPath = path.join(targetDir, targetFile);
            
            fs.writeFileSync(targetPath, convertedContent);
            console.log(`Converted: ${file} -> ${targetFile}`);
            converted++;
        } catch (error) {
            console.error(`Error converting ${file}:`, error.message);
        }
    });
    
    console.log(`\nConversion complete! Converted ${converted} files.`);
    console.log(`Total files found: ${files.length}`);
    console.log(`Already converted: ${alreadyConverted.length}`);
}

if (require.main === module) {
    convertAllFiles();
}

module.exports = { convertCypressToPlaywright, convertAllFiles };